// src/views/Warehouse/DeleteReceiptModal.tsx
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, CircularProgress } from 'src/shared/components/compat';
import axios from 'axios';
import server from 'src/core/config/endpoints.json';
import { useNavigate } from 'react-router-dom';
import { useTooltip, CustomTooltip } from 'src/shared/components/tooltip/TooltipContext';

interface DeleteReceiptModalProps {
    openModal: boolean;
    onClose: () => void;
    receiptIdToDelete: number | null;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const DeleteReceiptModal: React.FC<DeleteReceiptModalProps> = ({
    openModal,
    onClose,
    receiptIdToDelete,
    onDeleteSuccess,
    showAlert
}) => {
    const navigate = useNavigate();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDelete = async () => {
        if (!receiptIdToDelete) {
            showAlert('Silinecek makbuz seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('لطفاً وارد شوید.', 'warning');
            navigate("/");
            onClose();
            return;
        }

        setIsDeleting(true);
        try {
            const response = await axios.delete(
                `${server.baseurl}${server.warehouse}delete-receipt/${receiptIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Makbuz başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Makbuz silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('این رکورد در عملیات دیگری استفاده شده و قابل حذف یا ویرایش نیست.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('نشست شما به پایان رسید، لطفاً دوباره وارد شوید.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'Makbuz silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog
            open={openModal}
            onClose={onClose}
            aria-labelledby="delete-receipt-dialog-title"
            aria-describedby="delete-receipt-dialog-description"
        >
            <DialogTitle id="delete-receipt-dialog-title">
                {"آیا از حذف این برگه مطمئن هستید؟"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="delete-receipt-dialog-description">
                    Bu fişi silerseniz, bu işlem geri alınamaz. Kaydı silmek istediğinizden eminseniz,
                    <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> را بزنید.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? "لغو حذف" : ""}>
                    <Button onClick={onClose} disabled={isDeleting}>لغو</Button>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen makbuzu sil" : ""}>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDelete}
                        autoFocus
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...
                            </>
                        ) : (
                            'Silmek'
                        )}
                    </Button>
                </CustomTooltip>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteReceiptModal;