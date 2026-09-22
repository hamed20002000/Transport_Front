import React, { useState } from 'react';
import { IconButton, Menu, MenuItem as UiMenuItem, ListItemIcon } from 'src/shared/components/compat';
import { IconDots, IconEdit, IconTrash, IconFileDownload } from '@tabler/icons-react';
import { CustomTooltip, useTooltip } from 'src/shared/components/tooltip/TooltipContext';
import { MaterialRequestType, WorkhouseRentRequest } from 'src/features/operations/pages/list-request/RequestTabs';

interface ActionMenuProps {
    row: MaterialRequestType | WorkhouseRentRequest;
    type: 'material' | 'rental';
    permissions: {
        hasEdit: boolean;
        hasDelete: boolean;
        hasDownload: boolean;
    };
    handlers: {
        onEdit: (row: any) => void;
        onDelete: (row: any) => void;
        onDownload: (row: any) => void;
    };
}

const ActionMenu: React.FC<ActionMenuProps> = ({ row, permissions, handlers }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const openMenu = Boolean(anchorEl);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const isDisabled = row.status !== 0;

    return (
        <>
            <IconButton onClick={handleClick}>
                <IconDots width={18} />
            </IconButton>
            <Menu anchorEl={anchorEl} open={openMenu} onClose={handleClose}>
                {permissions.hasEdit && (
                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı düzenle" : ""}>
                        <UiMenuItem onClick={() => { handleClose(); handlers.onEdit(row); }} disabled={isDisabled}>
                            <ListItemIcon><IconEdit width={18} /></ListItemIcon> Düzenle
                        </UiMenuItem>
                    </CustomTooltip>
                )}
                {permissions.hasDelete && (
                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı sil" : ""}>
                        <UiMenuItem onClick={() => { handleClose(); handlers.onDelete(row); }} disabled={isDisabled}>
                            <ListItemIcon><IconTrash width={18} /></ListItemIcon> Silmek
                        </UiMenuItem>
                    </CustomTooltip>
                )}
                {permissions.hasDownload && (
                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Raporu İndir" : ""}>
                        <UiMenuItem onClick={() => { handleClose(); handlers.onDownload(row); }}>
                            <ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir
                        </UiMenuItem>
                    </CustomTooltip>
                )}
            </Menu>
        </>
    );
};

export default ActionMenu;