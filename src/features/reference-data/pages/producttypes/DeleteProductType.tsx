// DeleteProductType.tsx
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from 'src/shared/components/compat';
import axios from 'axios';
import { Bolt as BoltIcon } from 'src/shared/components/compat/icons';
import server from 'src/core/config/endpoints.json';
import { useTooltip, CustomTooltip } from 'src/shared/components/tooltip/TooltipContext';

type Props = {
    openModal: boolean;
    ProductTypesIdToDelete: number | null;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteProductType = ({ openModal, ProductTypesIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();
    const [openProductTypeInUseModal, setOpenProductTypeInUseModal] = useState<boolean>(false);
    const handleDeleteProductType = async () => {
        if (ProductTypesIdToDelete === null) {
            showAlert('Silinecek birim seçilmedi.', 'warning');
            onClose();
            return;
        }
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('لطفاً وارد شوید.', 'warning');
            return;
        }
        setLoading(true);
        try {
            const response = await axios.delete(
                `${server.baseurl}${server.initialoperations}delete-product-type/${ProductTypesIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Birim başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Birim silinirken bir hata oluşo.', 'error');
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
                const errorMessage = e.response?.data?.message || 'Birim silinirken bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };
    const handleCloseProductTypeInUseModal = () => {
        setOpenProductTypeInUseModal(false);
    };
    return (
        <>
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {"Bu direği veya trafoyu silmek istediğinizden emin misiniz?"}
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
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen birimi sil" : ""}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteProductType}
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
            <Dialog
                open={openProductTypeInUseModal}
                onClose={handleCloseProductTypeInUseModal}
                aria-labelledby="product-type-in-use-dialog-title"
                aria-describedby="product-type-in-use-dialog-description"
            >
                <DialogTitle id="product-type-in-use-dialog-title">
                    {"Hata: Ürün Tipi Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="product-type-in-use-dialog-description">
                        Bu ürün tipi şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseProductTypeInUseModal} autoFocus>
                        باشه
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default DeleteProductType;