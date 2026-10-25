// DeleteRollCalls.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress } from 'src/shared/components/compat';
import { IconTrash } from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/core/config/endpoints.json';
import { useTooltip, CustomTooltip } from 'src/shared/components/tooltip/TooltipContext';

interface RollCallRecord {
    id: number | string;
    personnelName: string;
    placeName: string;
}

type DeleteProps = {
    openModal: boolean;
    itemToDelete: RollCallRecord | null;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteRollCalls: React.FC<DeleteProps> = ({ openModal, itemToDelete, onClose, onDeleteSuccess, showAlert }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDelete = async () => {
        if (itemToDelete === null || itemToDelete.id === undefined || itemToDelete.id === null) {
            showAlert('رکوردی برای حذف انتخاب نشده است.', 'warning');
            onClose();
            return;
        }

        const idToDelete = itemToDelete.id;
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('لطفاً وارد شوید.', 'warning');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.delete(`${server.baseurl}${server.hr}delete-roll-call/${idToDelete}`, {
                headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 200) {
                showAlert('رکورد با موفقیت حذف شد!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'هنگام حذف رکورد خطایی رخ داد.', 'error');
                onClose();
            }

        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('این رکورد در عملیات دیگری استفاده شده و قابل حذف نیست.', 'error');
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('نشست شما به پایان رسید، لطفاً دوباره وارد شوید.', 'error');
                navigate('/');
            } else {
                showAlert(e.response?.data?.message || 'هنگام حذف رکورد خطای غیرمنتظره‌ای رخ داد.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const nameToDisplay = itemToDelete
        ? `${itemToDelete.personnelName} `
        : 'Seçili Kayıt';

    return (
        <Dialog open={openModal} onClose={onClose} aria-labelledby="delete-rollcall-title" aria-describedby="delete-rollcall-desc">
            <DialogTitle id="delete-rollcall-title">آیا از حذف این رکورد مطمئن هستید؟</DialogTitle>
            <DialogContent>
                <DialogContentText id="delete-rollcall-desc">
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: '#FA896B', margin: '5px 5px', display: 'inline-block' }}>{nameToDisplay}</span>
                    را اگر حذف کنید قابل بازگشت نیست. برای حذف
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: '#FA896B', margin: '0 5px' }}>Silmek</span> را بزنید.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? 'Silmeyi iptal et' : ''}>
                    <Button onClick={onClose} disabled={loading}>لغو</Button>
                </CustomTooltip>

                <CustomTooltip title={isTooltipGloballyEnabled ? 'حذف رکورد انتخاب‌شده' : ''}>
                    <Button color="error" variant="contained" onClick={handleDelete} autoFocus disabled={loading}>
                        {loading ? (<><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</>) : (
                            <>
                                <IconTrash size={20} style={{ marginRight: 8 }} /> Silmek
                            </>
                        )}
                    </Button>
                </CustomTooltip>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteRollCalls;