import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress, Typography } from 'src/shared/components/compat';

import axios from 'axios';
import server from 'src/core/config/endpoints.json';
import { useTooltip, CustomTooltip } from 'src/shared/components/tooltip/TooltipContext';

type DeleteProps = {
    openModal: boolean;
    idToDelete: number | string | null;
    nameToDelete: string;
    onClose: (success: boolean) => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteCourseDateTimes = ({ openModal, idToDelete, nameToDelete, onClose, onDeleteSuccess, showAlert }: DeleteProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDelete = async () => {
        if (idToDelete === null) {
            showAlert('رکوردی برای حذف انتخاب نشده است.', 'warning');
            onClose(false);
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('لطفاً وارد شوید.', 'warning');
            navigate('/');
            return;
        }

        setLoading(true);
        try {
            const url = `${server.baseurl}${server.education}delete-course-datetime/${idToDelete}`;

            const response = await axios.delete(
                url,
                {
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${authToken}`
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Kurs tarihi kaydı başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose(true);
            } else {
                showAlert(response.data.message || 'هنگام حذف رکورد خطایی رخ داد.', 'error');
                onClose(false);
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
            onClose(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={openModal}
            onClose={() => onClose(false)}
            aria-labelledby="delete-course-datetime-title"
            aria-describedby="delete-course-datetime-desc"
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle id="delete-course-datetime-title" sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6">تأیید حذف</Typography>
            </DialogTitle>

            <DialogContent>
                <DialogContentText id="delete-course-datetime-desc">
                    انتخاب شما
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#FA896B', margin: '0 5px' }}>{nameToDelete}</span>

                    kurs tarihi kaydını silerseniz bu işlem geri alınamaz. Lütfen onaylayın.
                </DialogContentText>
            </DialogContent>

            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? 'Silmeyi iptal et' : ''}>
                    <Button onClick={() => onClose(false)} disabled={loading} color="secondary" variant="outlined">
                        لغو
                    </Button>
                </CustomTooltip>

                <CustomTooltip title={isTooltipGloballyEnabled ? 'حذف دائمی رکورد انتخاب‌شده' : ''}>
                    <Button color="error" variant="contained" onClick={handleDelete} autoFocus disabled={loading}>
                        {loading ? (<><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</>) : ('Silmek')}
                    </Button>
                </CustomTooltip>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteCourseDateTimes;