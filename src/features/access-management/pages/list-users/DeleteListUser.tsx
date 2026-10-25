// DeleteListUser.tsx
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from 'src/shared/components/compat';
import { Bolt as BoltIcon } from 'src/shared/components/compat/icons';
import axios from 'axios';
import server from 'src/core/config/endpoints.json';

import { useTooltip, CustomTooltip } from 'src/shared/components/tooltip/TooltipContext';

type Props = {
  openModal: boolean;
  userIdToDelete: string | null;
  onClose: () => void;
  onDeleteSuccess: () => void;
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteListUser = ({ openModal, userIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const { isTooltipGloballyEnabled } = useTooltip();

  const handleDeleteUser = async () => {
    if (userIdToDelete === null) {
      showAlert('Silinecek kullanıcı seçilmedi.', 'warning');
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
        `${server.baseurl}${server.user}delete-user/${userIdToDelete}`,
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`,
          }
        }
      );

      if (response.data.httpStatusCode === 200) {
        showAlert('Kullanıcı başarıyla silindi!', 'success');
        onDeleteSuccess();
        onClose();
      } else {
        showAlert(response.data.message || 'Kullanıcı silinirken bir hata oluştu.', 'error');
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
    <>
      <Dialog
        open={openModal}
        onClose={onClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description">
        <DialogTitle id="alert-dialog-title">
          {"Bu kullanıcıyı silmek istediğinizden emin misiniz?"}
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
          <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen kullanıcıyı sil" : ""}>
            <Button
              color="error"
              variant="contained"
              onClick={handleDeleteUser}
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
    </>
  );
}

export default DeleteListUser;