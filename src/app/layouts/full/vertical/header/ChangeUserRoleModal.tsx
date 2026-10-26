// ChangeUserRoleModal.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, CircularProgress, FormControl, InputLabel, Select, MenuItem } from 'src/shared/components/compat';

import { useTooltip, CustomTooltip } from 'src/shared/components/tooltip/TooltipContext'; 


interface UserRole {
  name: string;
}

type Props = {
  open: boolean;
  onClose: () => void;
  userRoles: UserRole[];
  currentActiveRoleName: string | null;
  onRoleChange: (newRoleName: string) => void;
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const ChangeUserRoleModal = ({ open, onClose, userRoles, currentActiveRoleName, onRoleChange, showAlert }: Props) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(currentActiveRoleName);
  const [saving, setSaving] = useState(false);

  // **استفاده از useTooltip برای دسترسی به وضعیت Tooltip**
  const { isTooltipGloballyEnabled } = useTooltip();

  useEffect(() => {
    setSelectedRole(currentActiveRoleName);
  }, [currentActiveRoleName]);

  const handleSelectChange = (event: any) => {
    setSelectedRole(event.target.value as string);
  };

  const handleSave = async () => {
    if (selectedRole === null) {
      showAlert('لطفاً یک نقش انتخاب کنید.', 'warning');
      return;
    }
    if (selectedRole === currentActiveRoleName) {
      showAlert('نقش انتخاب‌شده همین الان نقش فعال شماست.', 'info');
      onClose();
      return;
    }

    setSaving(true);
    try {
      onRoleChange(selectedRole);
      showAlert(`نقش فعال شما به «${selectedRole}» تغییر کرد.`, 'success');
      onClose();
    } catch (error) {
      console.error("Error changing active role:", error);
      showAlert('هنگام تغییر نقش فعال خطایی رخ داد.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>تغییر نقش فعال</DialogTitle>
      <DialogContent dividers>
        {userRoles.length > 0 ? (
          <CustomTooltip title={isTooltipGloballyEnabled ? "برای انتخاب نقش فعال کلیک کنید" : ""}>
            <FormControl fullWidth>
              <InputLabel id="active-role-select-label">نقش را انتخاب کنید</InputLabel>
              <Select
                labelId="active-role-select-label"
                id="active-role-select"
                value={selectedRole || ''}
                label="نقش را انتخاب کنید"
                onChange={handleSelectChange}
              >
                {userRoles.map((role) => (
                  <MenuItem key={role.name} value={role.name}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CustomTooltip>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
            <Typography color="textSecondary">هیچ نقشی پیدا نشد.</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <CustomTooltip title={isTooltipGloballyEnabled ? "لغو تغییر نقش" : ""}>
          <Button onClick={onClose} color="error" disabled={saving}>
            لغو
          </Button>
        </CustomTooltip>
        <CustomTooltip title={isTooltipGloballyEnabled ? "ذخیره‌ی نقش انتخاب‌شده" : ""}>
          <Button onClick={handleSave} color="primary" variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'ذخیره'}
          </Button>
        </CustomTooltip>
      </DialogActions>
    </Dialog>
  );
};

export default ChangeUserRoleModal;