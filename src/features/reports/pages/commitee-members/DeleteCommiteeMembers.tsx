import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress } from 'src/shared/components/compat';
import axios from 'axios';
import server from 'src/core/config/endpoints.json';

import { useTooltip, CustomTooltip } from 'src/shared/components/tooltip/TooltipContext';

type Props = {
    openModal: boolean;
    memberIdToDelete: number | null;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteCommiteeMembers = ({ openModal, memberIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDeleteCommiteeMember = async () => {
        if (memberIdToDelete === null) {
            showAlert('Silinecek Komite Üyesi seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('لطفاً وارد شوید.', 'warning');
            navigate("/");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.delete(
                `${server.baseurl}${server.report}delete-commitee-member/${memberIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Komite Üyesi başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Komite Üyesi silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            console.error("Error deleting commitee member:", e);

            if (e.response && e.response.status === 500) {
                showAlert('این رکورد در عملیات دیگری استفاده شده و قابل حذف نیست.', 'error');
                onClose();
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('نشست شما به پایان رسید، لطفاً دوباره وارد شوید.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'Komite Üyesi silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };


    return (
        <>
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {"Bu Komite Üyesini silmek istediğinizden emin misiniz?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        با حذف، راه بازگشتی وجود ندارد. اگر از حذف رکورد مطمئن هستید،
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> را بزنید.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "لغو حذف" : ""}>
                        <Button onClick={onClose} disabled={loading}>لغو</Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen Üyeyi sil" : ""}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteCommiteeMember}
                            autoFocus
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
                                </>
                            ) : (
                                'Silmek'
                            )}
                        </Button>
                    </CustomTooltip>
                </DialogActions>
            </Dialog>


        </>
    );
}

export default DeleteCommiteeMembers;