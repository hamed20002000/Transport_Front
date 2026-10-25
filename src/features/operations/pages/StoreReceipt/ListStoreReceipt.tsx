import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TableContainer, Table, TableHead, TableRow, TableBody, TableCell as UiTableCell, MenuItem as UiMenuItem, Typography, Menu, IconButton, ListItemIcon, Box, Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment, CircularProgress, Paper, ToggleButtonGroup, ToggleButton as UiToggleButton, Autocomplete, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Radio, RadioGroup, FormControlLabel, DialogContentText } from 'src/shared/components/compat';
import { keyframes, styled } from 'src/shared/components/compat';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconArrowRight,
    IconEye, IconReload, IconX, IconFileSpreadsheet, IconFileText,
} from '@tabler/icons-react';
import { Bolt as BoltIcon } from 'src/shared/components/compat/icons';
import BlankCard from 'src/shared/components/BlankCard';
import CustomFormLabel from 'src/shared/components/form-controls/CustomFormLabel';
import CustomTextField from 'src/shared/components/form-controls/CustomTextField';
import { useTooltip, CustomTooltip } from 'src/shared/components/tooltip/TooltipContext';
import axios from 'axios';
import server from 'src/core/config/endpoints.json';
import { useAuth } from 'src/core/auth/AuthContext';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/shared/assets/fonts/NotoSans-Regular';
import Logo from 'src/shared/assets/images/logos/logo.png';
import { DatePicker, LocalizationProvider } from 'src/shared/components/compat';
import { AdapterDateFns } from 'src/shared/components/compat';
import DeleteReceipt from "src/features/operations/pages/StoreReceipt/DeleteStoreReceipt";
import Excel from 'exceljs';
import { saveAs } from 'file-saver';

const StyledTableCell = styled(UiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem' },
}));

interface WorkhouseType {
    id: string;
    name: string;
    code?: string;
    recordStatus: number;
    work?: { id: string; title?: string };
    status?: string;
}

interface StoreType {
    id: string;
    name: string;
    code: string;
    recordStatus: number;
    workhouse?: { id: string; name: string; }
}

interface WarehouseType {
    id: string;
    name: string;
    code: string;
    recordStatus: number;
}

interface ItemType {
    id: string;
    name: string;
    abbreviation: string;
    unit?: { id: string; title: string; };
    recordStatus?: number;
}

interface ReceiptDetailType {
    id: string;
    quantity: string;
    description: string;
    item: ItemType;
    warehouseDispatchDetail: {
        id: string;
        quantity: string;
        warehouseDispatchHeaders: { id: string; code: string; };
    } | null;
}

interface StoreReceiptType {
    id: string;
    code: string;
    docDate: string;
    createAt: string;
    description: string,
    recordStatus: number;
    status: string;
    isEnd?: boolean | null;
    storeReceiptDetails: ReceiptDetailType[];
    store: StoreType;
    warehouse: WarehouseType;
    warehouseDispatchHeaders?: { id: string; code: string; };
}

interface WarehouseDispatchDetail {
    id: string;
    quantity: string;
    description?: string;
    item: ItemType;
}

interface WarehouseDispatchHeader {
    id: string;
    code: string;
    docDate: string;
    recordStatus: number;
    isEnd: boolean | null;
    status?: number;
    statusDescription?: string;
    warehouse: WarehouseType;
    workhouse: { id: string; name: string };
    warehouseDispatchDetails: WarehouseDispatchDetail[];
}

interface FormReceiptDetail {
    itemId: string | null;
    quantity: number | string;
    description: string;
    item?: ItemType;
    warehouseDispatchDetailId: string | null;
    dispatchHeaderId?: string;
}

const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try { return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr }); }
    catch { return "تاریخ نامعتبر"; }
};

const calculateReceiptSummaries = (details: any[]) => {
    const summary: Record<string, number> = {};
    details.forEach(d => {
        const unitTitle = d.item?.unit?.title || "سایر";
        const qty = Number(d.quantity) || 0;
        summary[unitTitle] = (summary[unitTitle] || 0) + qty;
    });
    return summary;
};

const StyledToggleButton = styled(UiToggleButton)(({ theme, value, selected }) => ({
    '&.Ui-selected': {
        color: 'white',
        ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
        ...(value === 'active' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
        ...(value === 'inactive' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
    },
    '&:not(.Ui-selected)': {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': { backgroundColor: theme.palette.action.hover },
    },
}));

const blinkAnimation = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
  50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
  100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));

const addPdfHeader = (doc: jsPDF, title: string, subtitle?: string) => {

    const docAny = doc as any;
    docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 35;
    const logoHeight = 18;
    const margin = 15;
    const logoX = pageWidth - logoWidth - margin;

    try {
        doc.addImage(Logo, 'PNG', logoX, 10, logoWidth, logoHeight);
    } catch (e) {
        console.error("لوگو بارگذاری نشد", e);
    }

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('NotoSans', 'bold');
    doc.text(`تاریخ گزارش:`, 15, 35);
    doc.setFont('NotoSans', 'normal');
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 35);
    if (subtitle) doc.text(subtitle, 70, 52);

    doc.setLineWidth(0.5);
    doc.line(15, 40, pageWidth - 15, 40);
};

const addPdfFooter = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(8);
    doc.setFont('NotoSans', 'normal');
    doc.setTextColor(100);

    const companyInfo = [
        'ترابوت',
        'ترابوت، دستیار هوشمند حمل‌ونقل',
        'دستیار هوشمند حمل‌ونقل'
    ];

    let footerY = pageHeight - 20;
    companyInfo.forEach(line => {
        doc.text(line, pageWidth / 2, footerY, { align: 'center' });
        footerY += 4;
    });

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text('امضا', pageWidth - 20, pageHeight - 12, { align: 'right' });
    doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

    const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.text(`صفحه ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};


const exportReceiptsToPdf = (data: StoreReceiptType[], title: string, subtitle?: string) => {
    if (!data || data.length === 0) { console.warn("برگه‌ای برای ساخت PDF پیدا نشد."); return; }
    const doc = new jsPDF(); const docAny = doc as any; let yPos = 60;

    docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');

    data.forEach((receipt, index) => {
        if (index > 0) { doc.addPage(); yPos = 60; }
        addPdfHeader(doc, title, subtitle);
        doc.setFontSize(12);
        doc.text(`کد برگه: ${receipt.code}`, 15, yPos);
        doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, doc.internal.pageSize.getWidth() - 15, yPos, { align: 'right' });
        yPos += 7;
        const sevkKodu = receipt.storeReceiptDetails?.[0]?.warehouseDispatchDetail?.warehouseDispatchHeaders?.code || '-';
        doc.text(`کارگاه: ${receipt.store?.name || '-'}`, 15, yPos);
        doc.text(`Sevk Kodu: ${sevkKodu}`, doc.internal.pageSize.getWidth() - 15, yPos, { align: 'right' });
        yPos += 7;
        doc.text(`توضیحات کلی: ${receipt.description || '-'}`, 15, yPos);
        yPos += 10;

        const detailsRows = (receipt.storeReceiptDetails || []).map(d => [
            d.item?.name || '-',
            Number(d.quantity).toLocaleString('tr-TR'),
            d.item?.unit?.title || '-',
            d.description || '-'
        ]);

        const summaries = calculateReceiptSummaries(receipt.storeReceiptDetails || []);
        const summaryRows = Object.entries(summaries).map(([unit, total]) => [
            "TOPLAM:",
            total.toLocaleString('tr-TR'),
            unit,
            ""
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['کالا', 'مقدار', 'واحد', 'توضیحات']],
            body: detailsRows,
            foot: summaryRows,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            footStyles: { font: 'NotoSans', fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
            didDrawPage: (hookData: any) => {
                if (hookData.pageNumber > 1) addPdfHeader(doc, title, subtitle);
                addPdfFooter(doc);
            },
            columnStyles: { 0: { halign: 'left' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'left' } }
        });

        yPos = (docAny.lastAutoTable.finalY || yPos) + 10;
    });

    doc.save(`${title.replace(/ /g, '_')}.pdf`);
};

const addExcelHeader = (ws: Excel.Worksheet, title: string, columnsLength: number) => {
    ws.views = [{ rightToLeft: false }];
    const titleRow = ws.addRow([title]);
    titleRow.font = { name: 'NotoSans', size: 14, bold: true };
    ws.mergeCells(titleRow.number, 1, titleRow.number, columnsLength);
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    const dateRow = ws.addRow([`تاریخ گزارش: ${formatDateDisplay(new Date().toISOString())}`]);
    dateRow.font = { name: 'NotoSans', size: 10 };
    dateRow.getCell(1).alignment = { horizontal: 'left' };
    ws.mergeCells(dateRow.number, 1, dateRow.number, columnsLength);
    ws.addRow([]);
};
const addExcelCompanyInfo = (ws: Excel.Worksheet, startRow: number, columnsLength: number) => {
    const companyInfo = [
        'ترابوت',
        'ترابوت، دستیار هوشمند حمل‌ونقل',
        'دستیار هوشمند حمل‌ونقل',
    ];
    let rowNum = startRow;
    companyInfo.forEach(line => {
        const row = ws.getRow(rowNum);
        row.getCell(1).value = line;
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(1).font = { name: 'NotoSans', size: 8 };
        ws.mergeCells(`A${rowNum}:${String.fromCharCode(65 + columnsLength - 1)}${rowNum}`);
        rowNum++;
    });
};

const exportReceiptsToExcel = (data: StoreReceiptType[], title: string) => {
    if (!data || data.length === 0) throw new Error('داده‌ای برای ساخت Excel پیدا نشد.');
    const workbook = new Excel.Workbook();

    data.forEach(receipt => {
        const wsTitle = `برگه_${receipt.code}`.replace(/[\\/*?:[\]]/g, '_').substring(0, 30);
        const ws = workbook.addWorksheet(wsTitle);
        const cols = ['کالا', 'مقدار', 'واحد', 'توضیحات'];
        addExcelHeader(ws, title, cols.length);

        const sevkKodu = receipt.storeReceiptDetails?.[0]?.warehouseDispatchDetail?.warehouseDispatchHeaders?.code || '-';

        ws.addRow([`کد برگه:`, receipt.code]);
        ws.addRow([`کارگاه:`, receipt.store?.name || '-']);
        ws.addRow([`Belge Tarihi:`, formatDateDisplay(receipt.docDate)]);
        ws.addRow([`Sevk Kodu:`, sevkKodu]);
        ws.addRow(['توضیحات کلی', receipt.description || '-']);
        ws.addRow([]);

        const headerRow = ws.addRow(cols);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

        (receipt.storeReceiptDetails || []).forEach(d => {
            ws.addRow([d.item?.name || '-', Number(d.quantity), d.item?.unit?.title || '-', d.description || '-']);
        });

        ws.addRow([]);
        const summaryTitle = ws.addRow(["جمع بر اساس واحد"]);
        summaryTitle.font = { bold: true, underline: true };

        const summaries = calculateReceiptSummaries(receipt.storeReceiptDetails || []);
        Object.entries(summaries).forEach(([unit, total]) => {
            const r = ws.addRow(["TOPLAM:", total, unit]);
            r.getCell(1).font = { bold: true };
            r.getCell(1).alignment = { horizontal: 'right' };
            r.getCell(2).font = { bold: true };
        });

        ws.addRow([]);
        addExcelCompanyInfo(ws, ws.lastRow!.number + 2, cols.length);

        ws.getColumn(1).width = 30;
        ws.getColumn(2).width = 15;
        ws.getColumn(3).width = 15;
        ws.getColumn(4).width = 40;
    });

    const fileName = `${title.replace(/ /g, '_')}.xlsx`;
    return workbook.xlsx.writeBuffer().then(buffer => saveAs(new Blob([buffer]), fileName));
};

const ListStoreReceipts = () => {
    const { storeId: routeStoreId } = useParams<{ storeId: string }>();
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [selectedWorkhouse, setSelectedWorkhouse] = useState<WorkhouseType | null>(null);
    const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);

    const [generalDescription, setGeneralDescription] = useState('');
    const [dispatchHeaders, setDispatchHeaders] = useState<WarehouseDispatchHeader[]>([]);
    const [selectedDispatchHeader, setSelectedDispatchHeader] = useState<WarehouseDispatchHeader | null>(null);

    const [receiptDetails, setReceiptDetails] = useState<FormReceiptDetail[]>([]);
    const [removedReceiptDetails, setRemovedReceiptDetails] = useState<FormReceiptDetail[]>([]);

    const [receiptsList, setReceiptsList] = useState<StoreReceiptType[]>([]);
    const [displayedReceipts, setDisplayedReceipts] = useState<StoreReceiptType[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<StoreReceiptType | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [storesList, setStoresList] = useState<StoreType[]>([]);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [receiptIdToDelete, setReceiptIdToDelete] = useState<string | null>(null);
    const [receiptCodeToDelete, setReceiptCodeToDelete] = useState<string>('');

    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [viewedReceipt, setViewedReceipt] = useState<StoreReceiptType | null>(null);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [isFilterActive, setIsFilterActive] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    const [openDispatchListModal, setOpenDispatchListModal] = useState(false);
    const [openEndDispatchConfirmModal, setOpenEndDispatchConfirmModal] = useState(false);
    const [lastSelectedDispatch, setLastSelectedDispatch] = useState<WarehouseDispatchHeader | null>(null);

    const { isTooltipGloballyEnabled } = useTooltip();


    const { menuItems, allowedOperations } = useAuth();
    const findMenuByHref = (items: any[], path: string): any => {
        for (const item of items) {
            const normalizedItemHref = item.href?.replace(/\/$/, "");
            const normalizedPath = path.replace(/\/$/, "");

            if (normalizedItemHref && normalizedPath.startsWith(normalizedItemHref)) {
                return item;
            }

            if (item.children && item.children.length > 0) {
                const found = findMenuByHref(item.children, path);
                if (found) return found;
            }
        }
        return null;
    };

    const currentMenu = useMemo(() => {
        const baseRoute = location.pathname.split('/').slice(0, 3).join('/');
        return findMenuByHref(menuItems, baseRoute);
    }, [menuItems, location.pathname]);

    const currentMenuOpIds = useMemo(() => {
        if (!currentMenu || !currentMenu.menuOperations) return [];

        return currentMenu.menuOperations.map((op: any) => {
            return String(op.id);
        });
    }, [currentMenu]);

      const hasPermission = (opName: string) => {   
    return allowedOperations.some((op: any) =>
      op.systemOperationName === opName
    //  &&
    //   currentMenuOpIds.includes(String(op.menuOperationId))
    );
  };

    const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
    const hasEditPermission = useMemo(() => hasPermission("ویرایش"), [allowedOperations, currentMenuOpIds]);
    const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);
    const hasDownloadPermission = useMemo(() => hasPermission("دانلود و چاپ"), [allowedOperations, currentMenuOpIds]);


    const isStoreHidden = useMemo(() => !!routeStoreId, [routeStoreId]);

    const alertTimer = useRef<number | null>(null);
    useEffect(() => () => { if (alertTimer.current) window.clearTimeout(alertTimer.current); }, []);
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        if (alertTimer.current) window.clearTimeout(alertTimer.current);
        alertTimer.current = window.setTimeout(() => setAlertMessage(null), 5000);
    }, []);

    const fetchWorkhouses = useCallback(async (workIdParam?: string) => {
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) { navigate("/"); return; }
        let requestParams = {};
        if (role.toLowerCase() !== 'admin') { requestParams = { rolename: role }; }
        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + "get-workhouse",
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );
            if (response.data.httpStatusCode === 200) {
                const all: WorkhouseType[] = response.data.data;
                const filtered = workIdParam ? all.filter(i => i.work && Number(i.work.id) === Number(workIdParam)) : all;
                const withStatus = filtered.map(i => ({ ...i, status: i.recordStatus === 0 ? 'فعال' : 'غیرفعال' }));
                setWorkhousesList(withStatus.filter(w => w.recordStatus === 0));
            } else { showAlert(response.data.message || 'هنگام بارگذاری کارگاه‌ها خطایی رخ داد.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('این رکورد در عملیات دیگری استفاده شده و قابل حذف یا ویرایش نیست.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('نشست شما به پایان رسید، لطفاً دوباره وارد شوید.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'هنگام به‌روزرسانی سند ورود خطایی رخ داد.', 'error');
        } finally { setLoadingData(false); }
    }, [navigate, showAlert]);

    const fetchStoresByWorkhouseId = useCallback(async (workhouseId: string) => {
        if (!authToken) { navigate("/"); return []; }
        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + `get-stores-by-workhouse-id/${Number(workhouseId)}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) {
                const activeStores = (response.data.data as StoreType[]).filter(s => s.recordStatus === 0);
                setStoresList(activeStores);
                return activeStores;
            } else {
                showAlert(response.data.message || 'هنگام بارگذاری کارگاه‌ها خطایی رخ داد.', 'error');
                setStoresList([]);
                return [];
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('این رکورد در عملیات دیگری استفاده شده و قابل حذف یا ویرایش نیست.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('نشست شما به پایان رسید، لطفاً دوباره وارد شوید.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'هنگام به‌روزرسانی سند ورود خطایی رخ داد.', 'error');
            return []
        }
    }, [authToken, navigate, showAlert]);

    const fetchDispatchesByWorkhouseId = useCallback(async (workhouseId: string) => {
        if (!authToken) { navigate("/"); return []; }
        try {
            const url = `${server.baseurl}${server.warehouse}get-warehouse-dispatches-by-workhouse-id/${Number(workhouseId)}`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data?.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                const list: WarehouseDispatchHeader[] = res.data.data.map((h: any) => ({
                    id: String(h.id), code: String(h.code), docDate: String(h.docDate), recordStatus: Number(h.recordStatus),
                    isEnd: h.isEnd ?? null, status: h.status, statusDescription: h.statusDescription, warehouse: h.warehouse,
                    workhouse: h.workhouse,
                    warehouseDispatchDetails: (h.warehouseDispatchDetails || []).map((d: any) => ({
                        id: String(d.id), quantity: String(d.quantity), description: d.description || '', item: d.item,
                    })),
                }));
                setDispatchHeaders(list); return list;
            } else { setDispatchHeaders([]); showAlert(res.data?.message || 'هنگام بارگذاری اسناد ارسال خطایی رخ داد.', 'warning'); return []; }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('این رکورد در عملیات دیگری استفاده شده و قابل حذف یا ویرایش نیست.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('نشست شما به پایان رسید، لطفاً دوباره وارد شوید.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'هنگام به‌روزرسانی سند ورود خطایی رخ داد.', 'error');
            return []
        }
    }, [authToken, navigate, showAlert]);

    const fetchReceiptsRaw = useCallback(async (): Promise<StoreReceiptType[]> => {
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) { navigate("/"); return []; }
        let requestParams = {};
        if (role.toLowerCase() !== 'admin') { requestParams = { rolename: role }; }
        try {
            let url = server.baseurl + server.warehouse + "get-store-receipts";
            if (routeStoreId) url = server.baseurl + server.warehouse + `get-store-receipt-by-storeid/${routeStoreId}`;
            const response = await axios.get(url, { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams });
            if (response.data.httpStatusCode === 200) {
                const formatted: StoreReceiptType[] = response.data.data.map((r: any) => ({ ...r, status: r.recordStatus === 0 ? 'فعال' : 'غیرفعال' }));
                setReceiptsList(formatted);
                return formatted;
            } else { showAlert(response.data.message || 'هنگام بارگذاری برگه‌ها خطایی رخ داد.', 'error'); return []; }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('این رکورد در عملیات دیگری استفاده شده و قابل حذف یا ویرایش نیست.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('نشست شما به پایان رسید، لطفاً دوباره وارد شوید.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'هنگام به‌روزرسانی سند ورود خطایی رخ داد.', 'error');
            return []
        }
    }, [routeStoreId, navigate, showAlert, authToken]);

    const fetchReceipts = useCallback(async () => {
        setLoadingData(true);
        await fetchReceiptsRaw();
        setLoadingData(false);
    }, [fetchReceiptsRaw]);

    useEffect(() => {
        (async () => {
            await fetchReceipts();
            if (routeStoreId) {
                if (!authToken) { navigate("/"); return; }
                try {
                    const res = await axios.get(server.baseurl + server.initialoperations + `get-store-by-id/${routeStoreId}`, { headers: { "Authorization": `Bearer ${authToken}` } });
                    const store = res.data.data as StoreType;
                    if (store) {
                        setSelectedStore(store);
                        const whId = store.workhouse?.id;
                        if (whId) {
                            setSelectedWorkhouse({ id: whId, name: store.workhouse?.name || '', recordStatus: 0 });
                            await fetchStoresByWorkhouseId(whId);
                            await fetchDispatchesByWorkhouseId(whId);
                        }
                    }
                } catch { showAlert('Mağaza bilgileri yüklenirken bir hata oluştu.', 'error'); }
            } else {
                await fetchWorkhouses();
                setStoresList([]);
                setDispatchHeaders([]);
            }
        })();
    }, [fetchReceipts, fetchWorkhouses, fetchStoresByWorkhouseId, fetchDispatchesByWorkhouseId, routeStoreId, navigate, showAlert, authToken]);

    const paginatedReceipts = useMemo(() => displayedReceipts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [displayedReceipts, page, rowsPerPage]);

    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);

        const start = startDate ? new Date(new Date(startDate).setHours(0, 0, 0, 0)) : null;
        const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;

        const filtered = receiptsList.filter(r => {
            const sevk = r.warehouseDispatchHeaders?.code || r.storeReceiptDetails?.[0]?.warehouseDispatchDetail?.warehouseDispatchHeaders?.code || '';
            const matchesSearch = r.code.toLowerCase().includes(searchTerm.toLowerCase())
                || (r.store?.name && r.store.name.toLowerCase().includes(searchTerm.toLowerCase()))
                || (r.warehouse?.name && r.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()))
                || sevk.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && r.recordStatus === 0) || (statusFilter === 'inactive' && r.recordStatus === 1);
            const d = new Date(r.docDate);
            const matchesDate = (!start || d >= start) && (!end || d <= end);
            return matchesSearch && matchesStatus && matchesDate;
        });
        setDisplayedReceipts(filtered);
        setPage(0);
    }, [receiptsList, searchTerm, statusFilter, startDate, endDate]);

    const validateForm = useCallback((): boolean => {
        if (!docDate || !selectedStore || !selectedDispatchHeader) { showAlert('Lütfen zorunlu alanları doldurun: Belge Tarihi، Şantiye Depo و Sevk Belgesi.', 'warning'); return false; }
        if (receiptDetails.length === 0) { showAlert('Lütfen en az bir ürün ekleyin.', 'warning'); return false; }
        const hasInvalidItem = receiptDetails.some(d => { const qty = Number(d.quantity); return !d.itemId || d.warehouseDispatchDetailId == null || isNaN(qty) || qty <= 0; });
        if (hasInvalidItem) { showAlert('Lütfen tüm satırları doğru doldurun (malzeme, sevk satırı, miktar > 0).', 'warning'); return false; }
        return true;
    }, [docDate, selectedStore, selectedDispatchHeader, receiptDetails, showAlert]);

    useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);

    const resetFormAndState = () => {
        setDocDate(new Date()); setGeneralDescription(''); setSelectedWorkhouse(null); setSelectedStore(null); setSelectedDispatchHeader(null); setReceiptDetails([]); setRemovedReceiptDetails([]); setEditingId(null); setEditingCode(null); setIsFormVisible(false); setStoresList([]); setDispatchHeaders([]);
    };

    const handleRemoveReceiptDetail = (index: number) => {
        setReceiptDetails(prev => {
            const removed = prev[index]; if (removed) setRemovedReceiptDetails(p => [...p, removed]);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleRestoreLastRemoved = (idx: number) => {
        const item = removedReceiptDetails[idx];
        if (item) { setReceiptDetails(prev => [...prev, item]); setRemovedReceiptDetails(prev => prev.filter((_, i) => i !== idx)); }
    };


    const handleReceiptDetailChange = useCallback((index: number, field: keyof FormReceiptDetail, value: any) => {
        setReceiptDetails(prev => {
            const next = [...prev];
            const updated = { ...next[index] };

            if (field === 'quantity') {
                const numValue = Number(value);

                const originalDispatchItem = selectedDispatchHeader?.warehouseDispatchDetails.find(
                    d => d.id === updated.warehouseDispatchDetailId
                );
                const maxAllowed = originalDispatchItem ? Number(originalDispatchItem.quantity) : Infinity;

                if (numValue < 0) {
                    showAlert('Miktar 0\'dan küçük olamaz!', 'warning');
                    updated.quantity = 0;
                }
                else if (numValue > maxAllowed) {
                    showAlert(`Hata: Sevk miktarını (${maxAllowed}) aşamazsınız!`, 'error');
                    updated.quantity = maxAllowed;
                }
                else {
                    updated.quantity = value;
                }
            } else {
                (updated as any)[field] = value;
            }

            next[index] = updated;
            return next;
        });
    }, [showAlert, selectedDispatchHeader]);

    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    const handleEditClick = async () => {
        if (!selectedRowForMenu) return;
        handleCloseMenu(); setLoadingData(true);
        try {
            const receipt = selectedRowForMenu; const storeIdToFetch = receipt.store?.id || routeStoreId;
            if (!storeIdToFetch) { showAlert('Düzenlenecek mağaza bilgisi eksik.', 'error'); return; }
            setEditingId(receipt.id); setEditingCode(receipt.code); setDocDate(new Date(receipt.docDate)); setGeneralDescription(receipt.description || '');
            const storeRes = await axios.get(server.baseurl + server.initialoperations + `get-store-by-id/${storeIdToFetch}`, { headers: { "Authorization": `Bearer ${authToken}` } });
            const store = storeRes.data.data as StoreType; setSelectedStore(store || null);
            const whId = store?.workhouse?.id;
            if (whId) {
                setSelectedWorkhouse({ id: whId, name: store.workhouse!.name, recordStatus: 0 });
                await fetchStoresByWorkhouseId(whId);
                const headers = await fetchDispatchesByWorkhouseId(whId);
                const firstHeaderId = receipt.storeReceiptDetails?.[0]?.warehouseDispatchDetail?.warehouseDispatchHeaders?.id;
                if (firstHeaderId) { const found = (headers || []).find(h => String(h.id) === String(firstHeaderId)) || null; setSelectedDispatchHeader(found); }
            }
            const formatted: FormReceiptDetail[] = (receipt.storeReceiptDetails || []).map(d => ({
                itemId: d.item?.id ?? null, quantity: Number(d.quantity) || 0, description: d.description || '', item: d.item, warehouseDispatchDetailId: d.warehouseDispatchDetail?.id ?? null, dispatchHeaderId: d.warehouseDispatchDetail?.warehouseDispatchHeaders?.id ?? undefined,
            }));
            setReceiptDetails(formatted); setRemovedReceiptDetails([]);
        } catch (e: any) { showAlert(e.response?.data?.message || 'هنگام بارگذاری داده‌ها خطایی رخ داد.', 'error'); } finally { setLoadingData(false); }
        setIsFormVisible(true);
    };

    const handleCancelEdit = () => { resetFormAndState(); };
    const handleClickOpenDeleteModal = () => { if (selectedRowForMenu) { setReceiptIdToDelete(selectedRowForMenu.id); setReceiptCodeToDelete(selectedRowForMenu.code); setOpenDeleteModal(true); } handleCloseMenu(); };
    const handleCloseDeleteModal = () => { setOpenDeleteModal(false); setReceiptIdToDelete(null); setReceiptCodeToDelete(''); fetchReceipts(); };

    const insertReceipt = async () => {
        if (!validateForm()) return; setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = {
                docDate: docDate?.toISOString(), description: generalDescription, storeId: Number(routeStoreId || selectedStore?.id),
                receiptDetails: receiptDetails.map(d => ({ itemId: Number(d.itemId), quantity: Number(d.quantity), description: d.description, warehouseDispatchDetailId: Number(d.warehouseDispatchDetailId || 0), }))
            };
            const response = await axios.post(server.baseurl + server.warehouse + "create-store-receipt", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
            if (response.data.httpStatusCode === 201) {
                showAlert('برگه‌ی جدید با موفقیت اضافه شد!', 'success');
                if (selectedDispatchHeader) { setLastSelectedDispatch(selectedDispatchHeader); setOpenEndDispatchConfirmModal(true); }
                await fetchReceipts();
                if (selectedWorkhouse?.id) await fetchDispatchesByWorkhouseId(String(selectedWorkhouse.id));
            } else { showAlert(response.data.message || 'هنگام افزودن برگه خطایی رخ داد.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('این رکورد در عملیات دیگری استفاده شده و قابل حذف یا ویرایش نیست.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('نشست شما به پایان رسید، لطفاً دوباره وارد شوید.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'هنگام به‌روزرسانی سند ورود خطایی رخ داد.', 'error');
        } finally { setLoadingButton(false); }
    };

    const editReceipt = async () => {
        if (!validateForm()) return; setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = {
                id: Number(editingId), code: editingCode, docDate: docDate?.toISOString(), description: generalDescription, storeId: Number(routeStoreId || selectedStore?.id),
                receiptDetails: receiptDetails.map(d => ({ itemId: Number(d.itemId), quantity: Number(d.quantity), description: d.description, warehouseDispatchDetailId: Number(d.warehouseDispatchDetailId || 0), }))
            };
            const response = await axios.put(server.baseurl + server.warehouse + "update-store-receipt", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
            if (response.data.httpStatusCode === 200) { showAlert('برگه با موفقیت به‌روزرسانی شد!', 'success'); resetFormAndState(); fetchReceipts(); if (selectedWorkhouse?.id) await fetchDispatchesByWorkhouseId(String(selectedWorkhouse.id)); }
            else { showAlert(response.data.message || 'هنگام به‌روزرسانی برگه خطایی رخ داد.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) { showAlert('این رکورد در عملیات دیگری استفاده شده و قابل حذف یا ویرایش نیست.', 'error'); }
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('نشست شما به پایان رسید، لطفاً دوباره وارد شوید.', 'error'); navigate("/"); }
            else { showAlert(e.response?.data?.message || 'هنگام به‌روزرسانی برگه خطایی رخ داد.', 'error'); }
        } finally { setLoadingButton(false); }
    };

    const handleClearDateFilters = () => { setStartDate(null); setEndDate(null); };

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedReceiptForDownload, setSelectedReceiptForDownload] = useState<StoreReceiptType | null>(null);
    const handleDownload = (format: 'pdf' | 'excel', isFiltered: boolean) => {
        const dataToDownload = isFiltered ? displayedReceipts : receiptsList;
        const title = isFiltered ? 'گزارش برگه‌های فیلترشده' : 'گزارش همه‌ی برگه‌ها';
        const subtitle = isFiltered && (startDate || endDate) ? `بازه‌ی زمانی: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(endDate ? endDate.toISOString() : null)}` : undefined;
        try { if (format === 'pdf') exportReceiptsToPdf(dataToDownload, title, subtitle); else exportReceiptsToExcel(dataToDownload, title); showAlert('Başarıyla indirildi.', 'success'); } catch (e: any) { showAlert('خطایی رخ داد.', 'error'); }
    };
    const handleDownloadSingleReceipt = (format: 'pdf' | 'excel') => {
        if (!selectedReceiptForDownload) return;
        const data = [selectedReceiptForDownload]; const title = `جزئیات برگه: ${selectedReceiptForDownload.code}`;
        try { if (format === 'pdf') exportReceiptsToPdf(data, title); else exportReceiptsToExcel(data, title); showAlert('Başarıyla indirildi.', 'success'); } catch (e: any) { showAlert('خطایی رخ داد.', 'error'); }
        finally { setOpenRowDownloadModal(false); }
    };
    const handleOpenRowDownloadModal = (receipt: StoreReceiptType) => { setSelectedReceiptForDownload(receipt); setOpenRowDownloadModal(true); handleCloseMenu(); };
    const filteredDispatchHeaders = useMemo(() => (dispatchHeaders || []).filter(s => s.isEnd !== true), [dispatchHeaders]);

    const updateDispatchIsEnd = async (dispatchHeaderId: string, isEnd: boolean) => {
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = { id: Number(dispatchHeaderId), isEnd };
            const res = await axios.put(`${server.baseurl}${server.warehouse}update-warehouse-dispatch-is-end`, payload, { headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" } });
            if (res.data?.httpStatusCode === 200) {
                showAlert(isEnd ? 'Sevk belgesi sonlandırıldı.' : 'Sevk belgesi aktifleştirildi.', 'success');
                if (selectedWorkhouse?.id) await fetchDispatchesByWorkhouseId(String(selectedWorkhouse.id));
            } else { showAlert(res.data?.message || 'Sevk durumu güncellenemedi.', 'error'); }
        } catch (e: any) { showAlert(e.response?.data?.message || 'Sevk durumu güncellenirken hata oluştu.', 'error'); }
    };

    const handleToggleDispatchRow = async (row: WarehouseDispatchHeader, val: 'open' | 'ended') => {
        const shouldEnd = (val === 'ended');
        await updateDispatchIsEnd(row.id, shouldEnd);
        setDispatchHeaders(prev => prev.map(d => d.id === row.id ? { ...d, isEnd: shouldEnd } : d));
        if (shouldEnd && selectedDispatchHeader?.id === row.id) { setSelectedDispatchHeader(null); setReceiptDetails([]); setRemovedReceiptDetails([]); }
    };

    const handleConfirmEndDispatch = async (shouldEnd: boolean) => {
        setOpenEndDispatchConfirmModal(false);
        if (shouldEnd && lastSelectedDispatch?.id) { await updateDispatchIsEnd(lastSelectedDispatch.id, true); }
        else { showAlert('Sevk belgesi aktif bırakıldı.', 'info'); }
        if (selectedWorkhouse?.id) await fetchDispatchesByWorkhouseId(String(selectedWorkhouse.id));
        resetFormAndState();
    };

    const handleOpenDescriptionModal = (descriptionContent: string) => { setFullDescriptionContent(descriptionContent); setOpenDescriptionModal(true); };
    const handleCloseDescriptionModal = () => { setOpenDescriptionModal(false); setFullDescriptionContent(''); };

    return (
        <>
            <Box sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                    <Typography variant="h5">Şantiye Fişleri</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Şantiye Fişleri Belgesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking}>
                                    ثبت برگه‌ی جدید
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "برای پنهان کردن فرم ثبت کلیک کنید." : ""}>
                                <Button variant="contained" color="error" onClick={resetFormAndState} startIcon={<IconX size={20} />}>
                                    Gizle
                                </Button>
                            </CustomTooltip>
                        )}
                        {isStoreHidden && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "بازگشت" : ""}>
                                <Button variant="outlined" color="error" onClick={() => navigate(-1)} endIcon={<IconArrowRight size={20} />}>
                                    بازگشت
                                </Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Stack>

                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? `Fiş Düzenle (${editingCode})` : 'Yeni Fiş Oluştur'}</Typography>
                        <Grid container spacing={2}>
                            {!isStoreHidden && (
                                <Grid item xs={12} sm={3}>
                                    <CustomFormLabel required>کارگاه</CustomFormLabel>
                                    <Autocomplete
                                        options={workhousesList}
                                        getOptionLabel={(o) => o.name}
                                        value={selectedWorkhouse}
                                        onChange={async (_, nv) => {
                                            setSelectedWorkhouse(nv);
                                            setSelectedStore(null);
                                            setSelectedDispatchHeader(null);
                                            setReceiptDetails([]);
                                            setRemovedReceiptDetails([]);
                                            setDispatchHeaders([]);
                                            if (nv?.id) {
                                                await fetchStoresByWorkhouseId(nv.id);
                                                await fetchDispatchesByWorkhouseId(nv.id);
                                            } else {
                                                setStoresList([]);
                                            }
                                        }}
                                        isOptionEqualToValue={(o, v) => o.id === v?.id}
                                        renderInput={(p) => <TextField {...p} fullWidth size="small" placeholder="کارگاه را انتخاب کنید" />}
                                        disabled={!!editingId}
                                    />
                                </Grid>
                            )}

                            {!isStoreHidden && (
                                <Grid item xs={12} sm={3}>
                                    <CustomFormLabel required>انبار کارگاه</CustomFormLabel>
                                    <Autocomplete
                                        options={storesList}
                                        getOptionLabel={(o) => o.name}
                                        value={selectedStore}
                                        onChange={async (_, nv) => {
                                            setSelectedStore(nv);
                                            setSelectedDispatchHeader(null);
                                            setReceiptDetails([]);
                                            setRemovedReceiptDetails([]);
                                        }}
                                        isOptionEqualToValue={(o, v) => o.id === v?.id}
                                        renderInput={(p) => <TextField {...p} fullWidth size="small" placeholder="کارگاه را انتخاب کنید" />}
                                        disabled={!!editingId || !selectedWorkhouse}
                                    />
                                </Grid>
                            )}

                            <Grid item xs={12} sm={!isStoreHidden ? 3 : 6}>
                                <CustomFormLabel required>Belge Tarihi</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker
                                        label="" inputFormat="dd/MM/yyyy" value={docDate}
                                        onChange={(nv) => setDocDate(nv)}
                                        renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                                    />
                                </LocalizationProvider>
                            </Grid>

                            <Grid item xs={12} sm={!isStoreHidden ? 3 : 6}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <CustomFormLabel required>Sevk Belgesi</CustomFormLabel>
                                    <Button size="small" variant="outlined" onClick={() => setOpenDispatchListModal(true)}>
                                        Sevk Listesi
                                    </Button>
                                </Stack>
                                <Autocomplete<WarehouseDispatchHeader>
                                    options={filteredDispatchHeaders}
                                    getOptionLabel={(opt) => opt ? `${opt.code} — ${formatDateDisplay(opt.docDate)}` : ''}
                                    value={selectedDispatchHeader}
                                    onChange={(_, nv) => {
                                        setSelectedDispatchHeader(nv);
                                        setReceiptDetails([]);
                                        setRemovedReceiptDetails([]);
                                        if (nv?.warehouseDispatchDetails?.length) {
                                            const rows: FormReceiptDetail[] = nv.warehouseDispatchDetails.map((d: WarehouseDispatchDetail) => ({
                                                itemId: d.item?.id ?? null,
                                                quantity: Number(d.quantity) || 0,
                                                description: d.description || '',
                                                item: d.item,
                                                warehouseDispatchDetailId: d.id ?? null,
                                                dispatchHeaderId: nv.id,
                                            }));
                                            setReceiptDetails(rows);
                                        }
                                    }}
                                    isOptionEqualToValue={(o, v) => o.id === v?.id}
                                    renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Sevk Belgesi Seçin" />}
                                    disabled={!!editingId || !selectedStore}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <CustomFormLabel htmlFor="invoice-general-description">توضیحات</CustomFormLabel>
                                <TextField
                                    id="invoice-general-description"
                                    label="Şantiye Fişleri için genel açıklama giriniz"
                                    type="text" fullWidth multiline rows={3} variant="outlined"
                                    value={generalDescription}
                                    onChange={(e) => setGeneralDescription(e.target.value)}
                                />
                            </Grid>
                        </Grid>

                        <Box mt={4}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">جزئیات برگه</Typography>
                            </Stack>

                            {removedReceiptDetails.length > 0 && (
                                <Box sx={{ border: '1px dashed', borderColor: "error.main", p: 2, mb: 2, mt: 2, borderRadius: 1, backgroundColor: 'rgba(255,0,0,0.05)' }}>
                                    <Typography variant="subtitle1" color="error" mb={1}>کالاهای حذف‌شده</Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {removedReceiptDetails.map((detail, index) => (
                                            <Chip
                                                key={index}
                                                label={`${detail?.item?.name || 'Undefined'} (${detail.quantity})`}
                                                color="error"
                                                onDelete={() => handleRestoreLastRemoved(index)}
                                                deleteIcon={<IconReload size={18} />}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            )}

                            <Grid container spacing={2}>
                                {receiptDetails.map((detail, index) => {
                                    return (
                                        <Grid item xs={12} key={`${detail.itemId ?? index}-${detail.warehouseDispatchDetailId ?? 'x'}`}>
                                            <Grid container spacing={1.5} alignItems="center">
                                                <Grid item xs={12} md={4}>
                                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                                                        <Typography variant="body1" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {detail.item?.name || 'Aradığınız şey bulunamadı.'}
                                                        </Typography>
                                                        {detail.item?.unit?.title && (
                                                            <Chip label={detail.item.unit.title} color="secondary" variant="outlined" size="small" sx={{ ml: 1 }} />
                                                        )}
                                                    </Stack>
                                                </Grid>
                                                <Grid item xs={6} md={3}>
                                                    <CustomTextField
                                                        type="number"
                                                        placeholder="مقدار"
                                                        value={detail.quantity}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            handleReceiptDetailChange(index, 'quantity', e.target.value)
                                                        }
                                                        onInput={(e: any) => {
                                                            const val = Number(e.target.value);
                                                            const originalDispatchItem = selectedDispatchHeader?.warehouseDispatchDetails.find(
                                                                d => d.id === detail.warehouseDispatchDetailId
                                                            );
                                                            const maxAllowed = originalDispatchItem ? Number(originalDispatchItem.quantity) : Infinity;

                                                            if (val > maxAllowed) {
                                                                showAlert(`Maksimum miktar: ${maxAllowed}`, 'error');
                                                            }
                                                        }}
                                                        fullWidth
                                                        size="small"
                                                        InputProps={{
                                                            inputProps: {
                                                                min: 0,
                                                                max: selectedDispatchHeader?.warehouseDispatchDetails.find(
                                                                    d => d.id === detail.warehouseDispatchDetailId
                                                                )?.quantity,
                                                                step: "any"
                                                            }
                                                        }}
                                                        error={Number(detail.quantity) <= 0}
                                                    />
                                                </Grid>
                                                <Grid item xs={5} md={4}>
                                                    <CustomTextField
                                                        placeholder="توضیحات"
                                                        value={detail.description}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReceiptDetailChange(index, 'description', e.target.value)}
                                                        fullWidth size="small"
                                                    />
                                                </Grid>
                                                <Grid item xs={1} md={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <IconButton color="error" onClick={() => handleRemoveReceiptDetail(index)}>
                                                        <IconTrash />
                                                    </IconButton>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Box>

                        <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
                            {editingId ? (
                                <>
                                    <Button variant="contained" color="info" onClick={editReceipt} disabled={loadingButton}>
                                        {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'ویرایش'}
                                    </Button>
                                    <Button variant="outlined" color="secondary" onClick={handleCancelEdit} disabled={loadingButton}>لغو</Button>
                                </>
                            ) : (
                                hasCreatePermission && (
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "با پر کردن همه‌ی فیلدها برگه را ثبت کنید." : ""}>
                                        <span>
                                            <BlinkingButton
                                                variant="contained" color="success" onClick={insertReceipt}
                                                isBlinking={!loadingButton}
                                                disabled={loadingButton}
                                            >
                                                {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'افزودن برگه‌ی جدید'}
                                            </BlinkingButton>
                                        </span>
                                    </CustomTooltip>
                                )
                            )}
                        </Stack>
                    </Paper>
                )}

                {alertMessage && (
                    <Stack sx={{ width: '100%', mb: 3 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={() => setAlertMessage(null)}>{alertMessage}</Alert>
                    </Stack>
                )}

                <BlankCard>
                    <Grid item xs={12} mt={2} mr={2}>
                        <Stack direction="row" spacing={2} justifyContent="flex-end" mb={2} mr={2}>
                            {isFilterActive && hasDownloadPermission && (
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle Fişler indirin" : ""}>
                                    <BlinkingButton
                                        variant="contained" color="secondary" onClick={() => setOpenDownloadFilteredModal(true)}
                                        startIcon={<IconFileDownload />} isBlinking={true}
                                        disabled={loadingData || displayedReceipts.length === 0}
                                    >
                                        دانلود موارد فیلترشده
                                    </BlinkingButton>
                                </CustomTooltip>
                            )}
                            {hasDownloadPermission && (
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm Şantiye Fişleri indirin" : ""}>
                                    <Button
                                        variant="contained" color="primary" onClick={() => setOpenDownloadAllModal(true)}
                                        startIcon={<IconFileDownload />} disabled={loadingData || receiptsList.length === 0}
                                    >
                                        دانلود همه
                                    </Button>
                                </CustomTooltip>
                            )}
                        </Stack>
                    </Grid>

                    <Box sx={{ p: 2 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    label="جستجوی برگه" variant="outlined" fullWidth
                                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={6}>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <DatePicker label="تاریخ شروع" value={startDate} inputFormat="dd/MM/yyyy"
                                            onChange={(v) => setStartDate(v)}
                                            renderInput={(params) => (<TextField {...params} size="small" fullWidth />)}
                                        />
                                        <DatePicker label="تاریخ پایان" value={endDate} inputFormat="dd/MM/yyyy"
                                            onChange={(v) => setEndDate(v)}
                                            renderInput={(params) => (<TextField {...params} size="small" fullWidth />)}
                                        />
                                        <IconButton onClick={handleClearDateFilters} aria-label="clear date filters">
                                            <IconX size={20} />
                                        </IconButton>
                                    </Stack>
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <ToggleButtonGroup
                                    value={statusFilter} exclusive onChange={(_, v) => v && setStatusFilter(v)} fullWidth
                                >
                                    <StyledToggleButton value="all">همه</StyledToggleButton>
                                    <StyledToggleButton value="active">فعال</StyledToggleButton>
                                    <StyledToggleButton value="inactive">غیرفعال</StyledToggleButton>
                                </ToggleButtonGroup>
                            </Grid>
                        </Grid>
                    </Box>

                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress />
                            <Typography variant="h6" sx={{ ml: 2 }}>در حال بارگذاری برگه‌ها...</Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table aria-label="receipt table">
                                <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <StyledTableCell><Typography variant="h6">کد برگه</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">نام کارگاه</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Belge Tarihi</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">مقدار کل</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">توضیحات</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">جزئیات</Typography></StyledTableCell>
                                        <StyledTableCell></StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayedReceipts.length > 0 ? (
                                        paginatedReceipts.map(row => {
                                            const totalQuantity = (row.storeReceiptDetails || []).reduce((sum, d) => sum + Number(d.quantity), 0);
                                            return (
                                                <TableRow key={row.id}>
                                                    <StyledTableCell>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Typography variant="body1">{row.code || '-'}</Typography>
                                                        </Stack>
                                                    </StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1">{row.store?.name || '-'}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1" fontWeight="bold">{totalQuantity.toLocaleString()}</Typography></StyledTableCell>
                                                    <StyledTableCell sx={{ maxWidth: 150 }}>
                                                        {row.description && row.description.trim().length > 0 ? (
                                                            <CustomTooltip title={isTooltipGloballyEnabled ? "دیدن کل توضیحات" : ""}>
                                                                <Button

                                                                    variant="outlined"
                                                                    style={{ fontSize: "10px", padding: "2px 5px" }}
                                                                    onClick={() => handleOpenDescriptionModal(row.description)}
                                                                >
                                                                    خواندن توضیحات
                                                                </Button>
                                                            </CustomTooltip>
                                                        ) : (
                                                            <Typography variant="body2" align="center">-</Typography>
                                                        )}
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "مشاهده‌ی جزئیات" : ""}>
                                                            <Button
                                                                variant="outlined" startIcon={<IconEye />}
                                                                onClick={() => { setViewedReceipt(row); setOpenDetailsModal(true); }}
                                                            >
                                                                نما
                                                            </Button>
                                                        </CustomTooltip>
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <IconButton
                                                            onClick={(e) => { setSelectedRowForMenu(row); setAnchorEl(e.currentTarget); }}
                                                            aria-label="row menu"
                                                        >
                                                            <IconDots width={18} />
                                                        </IconButton>
                                                        <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                            {hasEditPermission && (
                                                                <UiMenuItem onClick={handleEditClick}>
                                                                    <ListItemIcon><IconEdit width={18} /></ListItemIcon>ویرایش
                                                                </UiMenuItem>
                                                            )}
                                                            {hasDeletePermission && (
                                                                <UiMenuItem onClick={handleClickOpenDeleteModal}>
                                                                    <ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek
                                                                </UiMenuItem>
                                                            )}
                                                            {hasDownloadPermission && (
                                                                <UiMenuItem onClick={() => handleOpenRowDownloadModal(selectedRowForMenu!)}>
                                                                    <ListItemIcon><IconFileDownload width={18} /></ListItemIcon> دانلود این ردیف
                                                                </UiMenuItem>
                                                            )}
                                                        </Menu>
                                                    </StyledTableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <StyledTableCell colSpan={7} align="center">
                                                <Typography variant="subtitle1" color="textSecondary">هیچ برگه‌ای پیدا نشد.</Typography>
                                            </StyledTableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={displayedReceipts.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        labelRowsPerPage="تعداد در هر صفحه:"
                    />
                </BlankCard>
            </Box>

            <Dialog
                open={openDescriptionModal}
                onClose={handleCloseDescriptionModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>توضیحات کامل</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText>
                        <div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} />
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDescriptionModal} color="primary">
                        بستن
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    جزئیات برگه
                    {viewedReceipt && <Typography component="span" variant="subtitle1" color="text.secondary" sx={{ ml: 1 }}>({viewedReceipt.code})</Typography>}
                </DialogTitle>
                <DialogContent dividers>
                    {viewedReceipt && viewedReceipt.storeReceiptDetails.length > 0 ? (
                        <>
                            <TableContainer component={Paper} variant="outlined">
                                <Table aria-label="جدول جزئیات کالا" size="small">
                                    <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                        <TableRow>
                                            <StyledTableCell><Typography variant="h6">کالا</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="h6">مقدار</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="h6">واحد</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="h6">توضیحات</Typography></StyledTableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {viewedReceipt.storeReceiptDetails.map((detail, index) => (
                                            <TableRow key={detail.id || index} hover>
                                                <StyledTableCell><Typography variant="body1">{detail.item?.name || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{Number(detail.quantity).toLocaleString()}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{detail.item?.unit?.title || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{detail.description || '-'}</Typography></StyledTableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                <TableContainer component={Paper} variant="outlined" sx={{ width: 'auto', minWidth: '300px' }}>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                            <TableRow>
                                                <StyledTableCell align="center" colSpan={2}>
                                                    <Typography variant="subtitle2" fontWeight="bold">جمع بر اساس واحد</Typography>
                                                </StyledTableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {Object.entries(calculateReceiptSummaries(viewedReceipt.storeReceiptDetails)).map(([unit, total]) => (
                                                <TableRow key={unit}>
                                                    <StyledTableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                                        جمع {unit}:
                                                    </StyledTableCell>
                                                    <StyledTableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                                                        {total.toLocaleString()}
                                                    </StyledTableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </>
                    ) : (
                        <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                            جزئیاتی برای این برگه پیدا نشد.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        sx={{ width: '100%' }}
                    >
                        <Button
                            variant="contained"
                            color="error"
                            fullWidth
                            sx={{ flex: 1 }}
                            startIcon={<IconFileText />}
                            disabled={!viewedReceipt}
                            onClick={() => { if (viewedReceipt) exportReceiptsToPdf([viewedReceipt], `برگه_${viewedReceipt.code}`); }}
                        >
                            دانلود PDF
                        </Button>

                        <Button
                            variant="contained"
                            color="success"
                            fullWidth
                            startIcon={<IconFileSpreadsheet />}
                            disabled={!viewedReceipt}
                            onClick={() => { if (viewedReceipt) exportReceiptsToExcel([viewedReceipt], `برگه_${viewedReceipt.code}`); }}
                            sx={{ flex: 1 }}
                        >
                            دانلود Excel
                        </Button>

                        <Button
                            onClick={() => setOpenDetailsModal(false)}
                            color="secondary"
                            variant="outlined"
                            fullWidth
                            sx={{ flex: 1 }}
                        >
                            بستن
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <DeleteReceipt
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                receiptIdToDelete={receiptIdToDelete}
                receiptCodeToDelete={receiptCodeToDelete}
                onDeleteSuccess={() => fetchReceipts()}
                showAlert={showAlert}
            />

            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>دانلود همه‌ی برگه‌ها</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => { handleDownload('pdf', false); setOpenDownloadAllModal(false); }}>
                            دانلود PDF
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => { handleDownload('excel', false); setOpenDownloadAllModal(false); }}>
                            دانلود Excel
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">بستن</Button></DialogActions>
            </Dialog>

            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Fişleri İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => { handleDownload('pdf', true); setOpenDownloadFilteredModal(false); }}>
                            دانلود PDF
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => { handleDownload('excel', true); setOpenDownloadFilteredModal(false); }}>
                            دانلود Excel
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">بستن</Button></DialogActions>
            </Dialog>

            <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs">
                <DialogTitle>قالب فایل را انتخاب کنید</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => handleDownloadSingleReceipt('pdf')}>
                            دانلود PDF
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => handleDownloadSingleReceipt('excel')}>
                            دانلود Excel
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenRowDownloadModal(false)} color="secondary">بستن</Button></DialogActions>
            </Dialog>

            <Dialog open={openDispatchListModal} onClose={() => setOpenDispatchListModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Sevk Belgeleri</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">کد</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">تاریخ</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">وضعیت</Typography></StyledTableCell>
                                    <StyledTableCell align="center"><Typography variant="h6">باز/بسته</Typography></StyledTableCell>
                                    <StyledTableCell align="right"><Typography variant="h6">عملیات</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(dispatchHeaders || []).length > 0 ? (
                                    dispatchHeaders.map((h) => (
                                        <TableRow key={h.id}>
                                            <StyledTableCell>{h.code}</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(h.docDate)}</StyledTableCell>
                                            <StyledTableCell>
                                                <Chip label={h.isEnd ? 'پایان‌یافته' : 'فعال'} color={h.isEnd ? 'error' : 'success'} />
                                            </StyledTableCell>
                                            <StyledTableCell align="center">
                                                <RadioGroup
                                                    row
                                                    value={h.isEnd ? 'ended' : 'open'}
                                                    onChange={(_, val) => handleToggleDispatchRow(h, val as 'open' | 'ended')}
                                                >
                                                    <FormControlLabel value="open" control={<Radio />} label="باز" />
                                                    <FormControlLabel value="ended" control={<Radio />} label="پایان‌یافته" />
                                                </RadioGroup>
                                            </StyledTableCell>
                                            <StyledTableCell align="right">
                                                {h.isEnd ? (
                                                    <Button size="small" variant="outlined" color="warning" onClick={() => updateDispatchIsEnd(h.id, false)}>
                                                        فعال کردن
                                                    </Button>
                                                ) : (
                                                    <Button size="small" variant="outlined" color="error" onClick={() => updateDispatchIsEnd(h.id, true)}>
                                                        پایان دادن
                                                    </Button>
                                                )}
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={5} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Sevk bulunamadı.</Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDispatchListModal(false)}>بستن</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openEndDispatchConfirmModal} onClose={() => setOpenEndDispatchConfirmModal(false)}>
                <DialogTitle>Sevk Durumu</DialogTitle>
                <DialogContent>
                    <Typography>
                        Giriş kaydedildi. Bu <strong>Sevk Belgesi</strong> sonlandırılsın mı؟
                    </Typography>
                    <Typography sx={{ mt: 1 }}>
                        <strong>Sevk Kodu:</strong> {lastSelectedDispatch?.code || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        (Sonlandırılan sevk tekrar fişe bağlanamaz.)
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleConfirmEndDispatch(false)} color="error">خیر</Button>
                    <Button onClick={() => handleConfirmEndDispatch(true)} color="primary" variant="contained" autoFocus>
                        بله (پایان ارسال)
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListStoreReceipts;