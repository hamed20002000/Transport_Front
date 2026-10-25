// DeleteSystemOperation.tsx
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
  rowIdToDelete: number | null;
  onClose: () => void;
  onDeleteSuccess: () => void;
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteSystemOperation = ({ openModal, rowIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const { isTooltipGloballyEnabled } = useTooltip();
  const handleDeleteOperation = async () => {
    if (rowIdToDelete === null) {
      showAlert('رکوردی برای حذف انتخاب نشده است.', 'warning');
      onClose();
      return;
    }
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate("/");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.delete(
        `${server.baseurl}${server.user}delete-system-operation/${rowIdToDelete}`,
        {
          headers: {
            "Accept": "text/plain",
            "Authorization": `Bearer ${authToken}`,
          }
        }
      );
      if (response.data.httpStatusCode === 200) {
        showAlert('رکورد با موفقیت حذف شد!', 'success');
        onDeleteSuccess();
        onClose();
      } else {
        showAlert(response.data.message || 'هنگام حذف رکورد خطایی رخ داد.', 'error');
      }
    } catch (e: any) {
      const errorMessage = (e.response?.data?.message == "Internal server error" ? "Bu işlem bir rol veya kullanıcı için kullanılmıştır ve silinemez." : "") || 'Kayıt silinirken bir hata oluştu, lütfen tekrar deneyin.';
      showAlert(errorMessage, 'error');
      onClose();
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('نشست شما منقضی شده یا دسترسی ندارید. لطفاً دوباره وارد شوید.', 'error');
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
          {"آیا از حذف این رکورد مطمئن هستید؟"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            با حذف، راه بازگشتی وجود ندارد. اگر از حذف رکورد مطمئن هستید،
            <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> را بزنید.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <CustomTooltip title={isTooltipGloballyEnabled ? "لغو عملیات" : ""}>
            <Button onClick={onClose} disabled={loading}>لغو</Button>
          </CustomTooltip>
          <CustomTooltip title={isTooltipGloballyEnabled ? "حذف رکورد انتخاب‌شده" : ""}>
            <Button
              color="error"
              variant="contained"
              onClick={handleDeleteOperation}
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

export default DeleteSystemOperation;