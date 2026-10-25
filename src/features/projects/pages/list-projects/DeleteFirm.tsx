// src/components/apps/projects/DeleteFirm.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from 'src/shared/components/compat';
import axios from 'axios';
import { Bolt as BoltIcon } from 'src/shared/components/compat/icons';
import server from 'src/core/config/endpoints.json';
import { useTooltip, CustomTooltip } from 'src/shared/components/tooltip/TooltipContext';

type Props = {
    openModal: boolean;
    firmIdToDelete: number | null;
    firmTitleToDelete: string;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteFirm = ({ openModal, firmIdToDelete, firmTitleToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDeleteFirm = async () => {
        if (firmIdToDelete === null) {
            showAlert('Silinecek firma seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.warn("توکن ورود پیدا نشد؛ انتقال به صفحه‌ی ورود.");
            navigate("/");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.delete(
                server.baseurl + server.warehouse + `delete-project-firm/${firmIdToDelete}`,
                {
                    headers: {
                        "Accept": "text/plain",
                        "Authorization": `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Firma başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Firma silinirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('این رکورد در عملیات دیگری استفاده شده و قابل حذف یا ویرایش نیست.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('نشست شما به پایان رسید، لطفاً دوباره وارد شوید.', 'error');
                navigate("/");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={openModal}
            onClose={onClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description">
            <DialogTitle id="alert-dialog-title">
                {"Bu firmayı silmek istediğinizden emin misiniz?"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    Eğer silerseniz, geri almanın bir yolu yoktur.
                    <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>{firmTitleToDelete}</span> firmasını silmek istediğinizden eminseniz,
                    <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> را بزنید.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? "لغو عملیات" : ""}>
                    <Button onClick={onClose} disabled={loading}>لغو</Button>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen firmayı sil" : ""}>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDeleteFirm}
                        autoFocus
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                            </>
                        ) : (
                            'Silmek'
                        )}
                    </Button>
                </CustomTooltip>
            </DialogActions>
        </Dialog>
    );
}

export default DeleteFirm;