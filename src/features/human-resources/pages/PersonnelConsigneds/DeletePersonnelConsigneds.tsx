import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress } from 'src/shared/components/compat';
import { IconTrash } from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/core/config/endpoints.json';
import { useTooltip, CustomTooltip } from 'src/shared/components/tooltip/TooltipContext';

type DeleteProps = {
    openModal: boolean;
    idToDelete: number | null;
    nameToDelete: string;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

export const DeletePersonnelConsigneds = ({ openModal, idToDelete, nameToDelete, onClose, onDeleteSuccess, showAlert }: DeleteProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDelete = async () => {
        if (idToDelete === null) {
            showAlert('رکوردی برای حذف انتخاب نشده است.', 'warning');
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
            const response = await axios.delete(`${server.baseurl}${server.hr}delete-personnel-consigned/${idToDelete}`, {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${authToken}`
                }
            });

            if (response.data.httpStatusCode === 200) {
                showAlert('Zimmet kaydı başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            }
            else {
                showAlert(response.data.message || 'هنگام حذف رکورد خطایی رخ داد.', 'error');
                onClose();
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu zimmet kaydı başka bir işlemde kullanıldığı için silinemez.', 'error');
            }
            else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('نشست شما به پایان رسید، لطفاً دوباره وارد شوید.', 'error');
                navigate('/');
            }
            else {
                showAlert(e.response?.data?.message || 'هنگام حذف رکورد خطای غیرمنتظره‌ای رخ داد.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={openModal}
            onClose={onClose}
            aria-labelledby="delete-consigned-title"
            aria-describedby="delete-consigned-desc"
        >
            <DialogTitle id="delete-consigned-title">Bu zimmet kaydını silmek istediğinizden emin misiniz? </DialogTitle>
            <DialogContent>
                <DialogContentText id="delete-consigned-desc">
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: '#FA896B', margin: '0 5px' }}>{nameToDelete}</span>
                    را اگر حذف کنید قابل بازگشت نیست. برای حذف
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: '#FA896B', margin: '0 5px' }}>Silmek</span>
                    را بزنید.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? 'Silmeyi iptal et' : ''}>
                    <Button onClick={onClose} disabled={loading} color="inherit">لغو</Button>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? 'حذف رکورد انتخاب‌شده' : ''}>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDelete}
                        autoFocus
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <IconTrash size={18} />}
                    >
                        {loading ? 'Bekleniyor...' : 'Silmek'}
                    </Button>
                </CustomTooltip>
            </DialogActions>
        </Dialog>
    );
};

export default DeletePersonnelConsigneds;