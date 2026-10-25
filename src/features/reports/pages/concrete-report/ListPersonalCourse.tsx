import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TableContainer, Table, TableHead, TableRow, TableBody, Typography, Box, TableCell as UiTableCell, Stack, Alert, CircularProgress, Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, Menu, ListItemIcon, Autocomplete, MenuItem, IconButton, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, InputAdornment, TableSortLabel, TablePagination } from 'src/shared/components/compat';
import { styled } from 'src/shared/components/compat';
import "src/features/reports/pages/concrete-report/style.css"
import {
    IconSearch, IconFileDownload, IconDots,
    IconSchool, IconFileSpreadsheet,
    IconRuler,
    IconX
} from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/core/config/endpoints.json';
import BlankCard from 'src/shared/components/BlankCard';
import CustomTextField from 'src/shared/components/form-controls/CustomTextField';
import { format } from 'date-fns';
import { DatePicker, LocalizationProvider } from 'src/shared/components/compat';
import { AdapterDateFns } from 'src/shared/components/compat';
import { tr } from 'date-fns/locale';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/shared/assets/fonts/NotoSans-Regular';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import Logo from 'src/shared/assets/images/logos/logo.png';


const visuallyHiddenStyle = {
    border: 0, clip: 'rect(0 0 0 0)', height: '1px', margin: -1,
    overflow: 'hidden', padding: 0, position: 'absolute',
    whiteSpace: 'nowrap', width: '1px',
};

const StyledTableCell = styled(UiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '0.9rem', },
    whiteSpace: 'nowrap',
}));

interface WorkhouseType {
    id: number; name: string; code: string; address: string; createAt: string; recordStatus: number;
}

interface CoursePersonnelReportRowType {
    workhouse_id: string;
    workhouse_code: string;
    workhouse_name: string;
    course_title: string;
    course_hours: number;
    course_isg: boolean;
    course_start_date_time: string;
    course_end_date_time: string;
    teacher_id: string;
    teacher_name: string;
    teacher_field: string;
    class_start_date_time: string;
    class_end_date_time: string;
    personnel_id: string;
    personnel_name: string;
    personnel_isg: boolean;
}

interface CoursePersonnelReportResponseType {
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    data: CoursePersonnelReportRowType[];
}

type CenterFilterValue = 'null' | 'true' | 'false';

interface FilterParams {
    workhouseId: number | null;
    fromDate: string;
    toDate: string;
    page: number;
    pageSize: number;
    isCenter: CenterFilterValue;
    teacherId: number | null;
    personnelId: number | null;
}

type Order = 'asc' | 'desc';

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    let aValue: any = a[orderBy];
    let bValue: any = b[orderBy];

    if (typeof aValue === 'number' && typeof bValue === 'number') {
    }
    else if (orderBy === 'course_start_date_time' || orderBy === 'class_start_date_time' || orderBy === 'class_end_date_time') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
    }
    else if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
    }

    if (bValue < aValue) return -1;
    if (bValue > aValue) return 1;
    return 0;
}

function getComparator<Key extends keyof any>(
    order: Order,
    orderBy: Key,
): (a: { [key in Key]: any }, b: { [key in Key]: any }) => number {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

const getCurrentYearDates = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    return {
        fromDate: format(startOfYear, 'yyyy-MM-dd'),
        toDate: format(endOfYear, 'yyyy-MM-dd'),
        startObj: startOfYear,
        endObj: endOfYear,
    };
};
interface DetailViewModalProps {
    open: boolean;
    onClose: () => void;
    report: CoursePersonnelReportRowType | null;
    onExportExcel: (report: CoursePersonnelReportRowType) => Promise<void>;
    onExportPdf: (report: CoursePersonnelReportRowType) => Promise<void>;
}

const DetailViewModal: React.FC<DetailViewModalProps> = ({ open, onClose, report, onExportExcel, onExportPdf }) => {
    if (!report) return null;

    const reportTitle = `Kurs Detayları: ${report.course_title}`;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{reportTitle}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="primary">Kurs Bilgileri</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="نام دوره" size="small" fullWidth value={report.course_title} disabled />
                            <CustomTextField label="ساعت آموزش" size="small" fullWidth value={`${report.course_hours} ساعت`} disabled />
                            <CustomTextField label="İSG Eğitimi" size="small" fullWidth value={report.course_isg ? 'بله' : 'خیر'} disabled />
                            <CustomTextField label="مربی" size="small" fullWidth value={`${report.teacher_name} (${report.teacher_field})`} disabled />
                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="success.main">Personel, Şantiye ve Tarihler</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="نام پرسنل" size="small" fullWidth value={report.personnel_name} disabled />
                            <CustomTextField label="نام کارگاه" size="small" fullWidth value={`${report.workhouse_name} (${report.workhouse_code})`} disabled />
                            <Tooltip title="Sadece kursun genel başlangıç tarihi">
                                <CustomTextField label="Kurs Başlangıç" size="small" fullWidth value={format(new Date(report.course_start_date_time), 'dd/MM/yyyy HH:mm')} disabled />
                            </Tooltip>
                            <Tooltip title="Personelin katıldığı dersin başlangıç tarihi">
                                <CustomTextField label="شروع درس" size="small" fullWidth value={format(new Date(report.class_start_date_time), 'dd/MM/yyyy HH:mm')} disabled />
                            </Tooltip>
                        </Stack>
                    </Grid>

                    <Grid item xs={12} mt={3}>
                        <Typography variant="h6" mb={1} color="secondary">📥 Bu Kayıt İçin Raporu İndir</Typography>
                        <Stack direction="row" spacing={2}>
                            <Button variant="contained" color="success" startIcon={<IconFileDownload />}
                                onClick={() => onExportPdf(report)} fullWidth>
                                PDF Olarak İndir (Detay)
                            </Button>
                            <Button variant="contained" color="primary" startIcon={<IconFileDownload />}
                                onClick={() => onExportExcel(report)} fullWidth>
                                Excel Olarak İndir (Detay)
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">بستن</Button>
            </DialogActions>
        </Dialog>
    );
};

const ListPersonalCourse = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    const { fromDate: defaultFromDateStr, toDate: defaultToDateStr, startObj: initialStartDate, endObj: initialEndDate } = getCurrentYearDates();

    const [startDate, setStartDate] = useState<Date | null>(initialStartDate);
    const [endDate, setEndDate] = useState<Date | null>(initialEndDate);

    const [searchTerm, setSearchTerm] = useState('');

    const [order, setOrder] = useState<Order>('desc');
    const [orderBy, setOrderBy] = useState<keyof CoursePersonnelReportRowType>('class_start_date_time');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [filterParams, setFilterParams] = useState<FilterParams>({
        workhouseId: null,
        fromDate: defaultFromDateStr,
        toDate: defaultToDateStr,
        page: 1,
        pageSize: 1000,
        isCenter: 'null',
        teacherId: null,
        personnelId: null,
    });

    const [reportData, setReportData] = useState<CoursePersonnelReportResponseType | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<CoursePersonnelReportRowType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDetailViewModal, setOpenDetailViewModal] = useState(false);
    const [selectedReportToDownload, setSelectedReportToDownload] = useState<CoursePersonnelReportRowType | null>(null);


    const formatDateDisplay = (dateString: string | null | undefined): string => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'dd/MM/yyyy HH:mm').includes('NaN') ?
                format(new Date(dateString.substring(0, 10)), 'dd/MM/yyyy') :
                format(new Date(dateString), 'dd/MM/yyyy HH:mm');
        } catch (e) {
            return '-';
        }
    };

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message); setAlertSeverity(severity);
        setTimeout(() => setAlertMessage(null), 5000);
    }, []);
    const clearAlert = () => { setAlertMessage(null); };

    const handleApiError = useCallback((e: any, defaultMessage: string = 'خطایی رخ داد.') => {
        if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('نشست شما به پایان رسید، لطفاً دوباره وارد شوید.', 'error'); navigate("/"); }
        else if (e.response?.status === 500) { showAlert('خطای سیستمی رخ داد، لطفاً دوباره تلاش کنید.', 'error'); }
        else { console.error("API Error:", e); showAlert(e.response?.data?.message || defaultMessage, 'error'); }
    }, [navigate, showAlert]);

    const handleFilterChange = (name: keyof FilterParams, value: any) => {
        setFilterParams(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: CoursePersonnelReportRowType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleOpenDetailViewModal = (report: CoursePersonnelReportRowType) => {
        setSelectedReportToDownload(report);
        setOpenDetailViewModal(true);
        handleCloseMenu();
    };
    const handleCloseDetailViewModal = () => {
        setOpenDetailViewModal(false);
        setSelectedReportToDownload(null);
    };

    const getWorkhousesList = useCallback(async () => {
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
                const activeWorkhouses = response.data.data.filter((wh: WorkhouseType) => wh.recordStatus === 0);
                setWorkhousesList(activeWorkhouses);
            } else {
                showAlert(response.data.message || 'فهرست کارگاه‌ها دریافت نشد.', 'error');
            }
        } catch (e: any) { handleApiError(e, 'فهرست کارگاه‌ها دریافت نشد.'); }
    }, [navigate, authToken, showAlert, handleApiError]);


    const fetchCoursePersonnelReportData = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }

        const isCenterParam = filterParams.isCenter === 'null' ? null : filterParams.isCenter;

        const requestParams = {
            workhouseId: filterParams.workhouseId || null,
            fromDate: filterParams.fromDate || null,
            toDate: filterParams.toDate || null,
            center: isCenterParam,
            page: filterParams.page,
            pageSize: filterParams.pageSize,
            teacherId: filterParams.teacherId || null,
            personnelId: filterParams.personnelId || null,
        };

        setLoadingData(true);
        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-course-personnel-report-data`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {
                setReportData(response.data.data as CoursePersonnelReportResponseType);
            } else {
                setReportData(null);
                showAlert(response.data.message || 'Kurs/Eğitim rapor verileri alınamadı.', 'error');
            }
        } catch (e: any) {
            setReportData(null);
            handleApiError(e, 'هنگام دریافت داده‌های گزارش مشکلی پیش آمد.');
        } finally {
            setLoadingData(false);
        }
    }, [filterParams, navigate, authToken, showAlert, handleApiError]);
    useEffect(() => {
        getWorkhousesList();
    }, [getWorkhousesList]);

    useEffect(() => {
        if (startDate) {
            setFilterParams(prev => ({ ...prev, fromDate: format(startDate, 'yyyy-MM-dd'), page: 1 }));
        }
    }, [startDate]);

    useEffect(() => {
        if (endDate) {
            setFilterParams(prev => ({ ...prev, toDate: format(endDate, 'yyyy-MM-dd'), page: 1 }));
        }
    }, [endDate]);
    useEffect(() => {
        fetchCoursePersonnelReportData();
    }, [
        filterParams.workhouseId,
        filterParams.fromDate,
        filterParams.toDate,
        filterParams.isCenter,
    ]);

    const handleRequestSort = (property: keyof CoursePersonnelReportRowType) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const filteredReportData = useMemo(() => {
        if (!reportData?.data) return [];
        let data = [...reportData.data];

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
            data = data.filter(row => {
                const columnsToSearch = [
                    row.course_title,
                    row.workhouse_name,
                    row.teacher_name,
                    row.personnel_name,
                    row.workhouse_code
                ];
                return columnsToSearch.some(col => col && col.toLowerCase().includes(lowerCaseSearchTerm));
            });
        }

        if (orderBy) {
            data.sort(getComparator(order, orderBy));
        }

        return data;
    }, [reportData, searchTerm, order, orderBy]);

    useEffect(() => {
        setPage(0);
    }, [searchTerm, filterParams, reportData]);


    const visibleRows = useMemo(() => {
        return filteredReportData.slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage,
        );
    }, [filteredReportData, page, rowsPerPage]);


    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };



    const addPdfHeader = (doc: jsPDF, title: string) => {

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
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 80, 35);

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

        let footerY = pageHeight - 40;
        companyInfo.forEach(line => {
            doc.text(line, pageWidth / 2, footerY, { align: 'center' });
            footerY += 10;
        });

        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.text('امضا', pageWidth - 20, pageHeight - 12, { align: 'right' });
        doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

        const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.text(`صفحه ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    };


    const handleExportPdfSingle = async (report: CoursePersonnelReportRowType) => {
        if (!authToken) { showAlert('لطفاً وارد شوید.', 'warning'); return; }
        showAlert('گزارش PDF در حال آماده‌سازی است، لطفاً صبر کنید...', 'info');

        try {
            const doc = new jsPDF('portrait', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            const reportTitle = `Kurs Detay Raporu: ${report.course_title} - ${report.personnel_name}`;
            addPdfHeader(doc, reportTitle);

            const tableColumn = ["فیلد", "مقدار"];
            const tableRows = [
                ["نام پرسنل", report.personnel_name],
                ["Şantiye/İşyeri", report.workhouse_name],
                ["کد کارگاه", report.workhouse_code],
                ["نام دوره", report.course_title],
                ["مربی", report.teacher_name],
                ["Branş", report.teacher_field],
                ["ساعت آموزش", `${report.course_hours} ساعت`],
                ["İSG Eğitimi", report.course_isg ? 'بله' : 'خیر'],
                ["شروع درس", format(new Date(report.class_start_date_time), 'dd/MM/yyyy HH:mm')],
                ["Ders Bitiş", format(new Date(report.class_end_date_time), 'dd/MM/yyyy HH:mm')],
            ];

            autoTable(doc, {
                startY: 70, head: [tableColumn], body: tableRows, theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 9, cellPadding: 6, },
                headStyles: { fillColor: [60, 141, 188], textColor: 255 },
                didDrawPage: (_data) => { addPdfFooter(doc); }
            });

            doc.save(`Kurs_Detay_${report.personnel_id}_${format(new Date(), 'yyyyMMdd')}.pdf`);
            showAlert('گزارش PDF با موفقیت ساخته شد و در حال دانلود است.', 'success');
        } catch (e: any) { handleApiError(e, 'هنگام ساخت گزارش PDF خطایی رخ داد.'); }
    };

    const handleExportExcelSingle = async (report: CoursePersonnelReportRowType) => {
        if (!authToken) { showAlert('لطفاً وارد شوید.', 'warning'); return; }
        showAlert('گزارش Excel در حال آماده‌سازی است، لطفاً صبر کنید...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Kurs Detay', { views: [{ rightToLeft: false }] });

            const data = [
                ['نام پرسنل', report.personnel_name],
                ['Şantiye/İşyeri', report.workhouse_name],
                ['کد کارگاه', report.workhouse_code],
                ['نام دوره', report.course_title],
                ['مربی', report.teacher_name],
                ['Branş', report.teacher_field],
                ['ساعت آموزش', report.course_hours],
                ['İSG Eğitimi', report.course_isg ? 'بله' : 'خیر'],
                ['شروع درس', format(new Date(report.class_start_date_time), 'dd/MM/yyyy HH:mm')],
                ['Ders Bitiş', format(new Date(report.class_end_date_time), 'dd/MM/yyyy HH:mm')],
            ];

            const titleRow = sheet.addRow([`Personel Kurs Raporu Detayı: ${report.course_title}`]);
            titleRow.font = { name: 'Calibri', size: 14, bold: true };
            sheet.mergeCells('A1:B1'); sheet.addRow([]);

            const headerRow = sheet.addRow(['فیلد', 'مقدار']);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; cell.font = { bold: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            data.forEach(row => {
                const newRow = sheet.addRow(row);
                newRow.eachCell((cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
            });

            sheet.columns[0].width = 25; sheet.columns[1].width = 35;
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Kurs_Detay_${report.personnel_id}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            showAlert('گزارش Excel با موفقیت ساخته شد و در حال دانلود است.', 'success');
        } catch (e: any) { handleApiError(e, 'هنگام ساخت گزارش Excel خطایی رخ داد.'); }
    };

    const fetchAllFilteredData = useCallback(async () => {
        if (!authToken) { navigate("/"); return null; }

        const isCenterParam = filterParams.isCenter === 'null' ? null : filterParams.isCenter;

        const requestParams = {
            workhouseId: filterParams.workhouseId || null,
            fromDate: filterParams.fromDate || null,
            toDate: filterParams.toDate || null,
            isCenter: isCenterParam,
            page: 1,
            pageSize: 10000,
            teacherId: filterParams.teacherId || null,
            personnelId: filterParams.personnelId || null,
        };

        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-course-personnel-report-data`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {
                let allData = response.data.data.data as CoursePersonnelReportRowType[];

                if (searchTerm) {
                    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
                    allData = allData.filter(row => {
                        const columnsToSearch = [
                            row.course_title,
                            row.workhouse_name,
                            row.teacher_name,
                            row.personnel_name,
                            row.workhouse_code
                        ];
                        return columnsToSearch.some(col => col && col.toLowerCase().includes(lowerCaseSearchTerm));
                    });
                }

                if (orderBy) {
                    allData.sort(getComparator(order, orderBy));
                }

                return allData;
            }
            showAlert('داده‌ای برای خروجی پیدا نشد.', 'error');
            return null;
        } catch (e: any) {
            handleApiError(e, 'Veri alınırken hata oluştu.');
            return null;
        }
    }, [filterParams, navigate, authToken, searchTerm, order, orderBy, showAlert, handleApiError]);


    const handleExportPdfAll = async () => {
        showAlert('Genel PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');

        const allData = await fetchAllFilteredData();
        if (!allData || allData.length === 0) {
            showAlert('گزارش دانلود نشد: داده‌ای وجود ندارد.', 'warning');
            return;
        }

        try {
            const doc = new jsPDF('landscape', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            addPdfHeader(doc, "Personel Kurs Genel Raporu");

            const tableColumn = ["نام کارگاه", "نام دوره", "مربی", "ساعت آموزش", "شروع درس", "نام پرسنل"];

            const tableRows = allData.map(row => [
                row.workhouse_name,
                row.course_title,
                row.teacher_name,
                `${row.course_hours} saat`,
                format(new Date(row.class_start_date_time), 'dd/MM/yyyy HH:mm'),
                row.personnel_name,
            ]);

            autoTable(doc, {
                startY: 70, head: [tableColumn], body: tableRows, theme: 'striped',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 5, },
                headStyles: { fillColor: [30, 100, 120], textColor: 255 },
                footStyles: { fillColor: [230, 240, 245], textColor: [0, 0, 0], fontStyle: 'normal', fontSize: 9 },
                didDrawPage: (_data) => { addPdfFooter(doc); }
            });

            doc.save(`Kurs_Genel_Rapor_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
            showAlert('Genel PDF raporu başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e) { handleApiError(e, 'Genel PDF raporu oluşturulurken bir hata oluştu.'); }
    };

    const handleExportExcelAll = async () => {
        showAlert('Genel Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');

        const allData = await fetchAllFilteredData();
        if (!allData || allData.length === 0) {
            showAlert('گزارش دانلود نشد: داده‌ای وجود ندارد.', 'warning');
            return;
        }

        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Kurs Personel Genel Raporu', { views: [{ rightToLeft: false }] });

            const data = allData.map(row => {
                return [
                    row.workhouse_name,
                    row.course_title,
                    row.teacher_name,
                    row.course_hours,
                    format(new Date(row.class_start_date_time), 'dd/MM/yyyy HH:mm'),
                    row.personnel_name,
                ];
            });

            const headerRowData = ["نام کارگاه", "نام دوره", "مربی", "ساعت آموزش", "شروع درس", "نام پرسنل"];

            sheet.addRow(["Personel Kurs Genel Raporu"]);
            sheet.mergeCells('A1:F1'); sheet.getRow(1).font = { bold: true, size: 14 };
            sheet.addRow(["Toplam Kayıt:", allData.length]);
            sheet.addRow([]);

            const headerRow = sheet.addRow(headerRowData);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0E6F0' } }; cell.font = { bold: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            data.forEach(row => {
                const newRow = sheet.addRow(row);
                newRow.eachCell((cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
            });

            sheet.columns.forEach((column, index) => {
                const minWidth = (index === 1 || index === 5) ? 30 : 18;
                column.width = minWidth;
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Kurs_Genel_Rapor_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
            showAlert('Genel Excel raporu başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e, 'Genel Excel raporu oluşturulurken bir hata oluştu.'); }
    };


    const tableHeaders: { label: string; key: keyof CoursePersonnelReportRowType }[] = [
        { label: 'نام کارگاه', key: 'workhouse_name' },
        { label: 'نام دوره', key: 'course_title' },
        { label: 'مربی', key: 'teacher_name' },
        { label: 'ساعت آموزش', key: 'course_hours' },
        { label: 'شروع درس', key: 'class_start_date_time' },
        { label: 'نام پرسنل', key: 'personnel_name' },
    ];


    return (
        <Box>
            <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconSchool size={28} style={{ marginRight: 8 }} /> Personel Kurs Raporları
            </Typography>

            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            <BlankCard sx={{ mb: 5, p: 3 }}>
                <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
                <Grid container spacing={3} p={2}>

                    <Grid item xs={12} sm={6} md={6}>
                        <Autocomplete
                            id="workhouse-select"
                            options={workhousesList}
                            getOptionLabel={(o) => `${o.name} (${o.code})`}
                            value={workhousesList.find(wh => wh.id === filterParams.workhouseId) || null}
                            onChange={(_, newValue) => handleFilterChange('workhouseId', newValue?.id || null)}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            renderInput={(params) => (<TextField {...params} label="کارگاه را انتخاب کنید" fullWidth size="small" />)}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={6}>
                        <FormControl component="fieldset" fullWidth>
                            <FormLabel component="legend" sx={{ fontSize: '0.875rem' }}>Merkez Durumu</FormLabel>
                            <RadioGroup
                                row
                                name="isCenter-radio-group"
                                value={filterParams.isCenter}
                                onChange={(event) => handleFilterChange('isCenter', event.target.value as CenterFilterValue)}
                            >
                                <FormControlLabel value="null" control={<Radio size="small" />} label="همه" />
                                <FormControlLabel value="true" control={<Radio size="small" />} label="Sadece Merkez" />
                                <FormControlLabel value="false" control={<Radio size="small" />} label="Merkezsiz" />
                            </RadioGroup>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6} md={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <DatePicker
                                label="تاریخ شروع"
                                value={startDate}
                                onChange={(v) => setStartDate(v)}
                                inputFormat="dd/MM/yyyy"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        size="small"
                                        InputLabelProps={{ shrink: true }}
                                        onKeyDown={(e) => e.preventDefault()}
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setStartDate(initialStartDate);
                                                        }}
                                                        sx={{ marginRight: -1 }}
                                                    >
                                                        <IconX size={16} />
                                                    </IconButton>
                                                    {params.InputProps?.endAdornment}
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} sm={6} md={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <DatePicker
                                label="تاریخ پایان"
                                value={endDate}
                                onChange={(v) => setEndDate(v)}
                                inputFormat="dd/MM/yyyy"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        size="small"
                                        InputLabelProps={{ shrink: true }}
                                        onKeyDown={(e) => e.preventDefault()}
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEndDate(initialEndDate);
                                                        }}
                                                        sx={{ marginRight: -1 }}
                                                    >
                                                        <IconX size={16} />
                                                    </IconButton>
                                                    {params.InputProps?.endAdornment}
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>
                </Grid>

                <Box sx={{ p: 2, mt: 1 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Tabloda Ara (Kurs, Şantiye, Personel...)"
                                variant="outlined" fullWidth size="small"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6} display="flex" justifyContent="flex-end" gap={1}>
                            <Button variant="outlined" color="success" startIcon={<IconFileSpreadsheet />} onClick={handleExportExcelAll} disabled={loadingData || !reportData?.data?.length}>
                                دانلود همه‌ی داده‌ها در Excel
                            </Button>
                            <Button variant="outlined" color="error" startIcon={<IconFileDownload />} onClick={handleExportPdfAll} disabled={loadingData || !reportData?.data?.length}>
                                دانلود همه‌ی داده‌ها در PDF
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </BlankCard>

            <Box sx={{ margin: "20px 0" }}></Box>

            <BlankCard>
                <TableContainer sx={{ overflowX: 'auto', mt: "3" }}>
                    <Table aria-label="course personnel report table">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                {tableHeaders.map((header) => (
                                    <StyledTableCell key={header.key}>
                                        <TableSortLabel
                                            active={orderBy === header.key}
                                            direction={orderBy === header.key ? order : 'asc'}
                                            onClick={() => handleRequestSort(header.key)}
                                        >
                                            <Typography variant="h6" fontWeight="bold">
                                                {header.label}
                                            </Typography>
                                            {orderBy === header.key ? (
                                                <Box component="span" sx={visuallyHiddenStyle}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null}
                                        </TableSortLabel>
                                    </StyledTableCell>
                                ))}
                                <StyledTableCell><Typography variant="h6" fontWeight="bold">عملیات</Typography></StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length + 1} align="center"><CircularProgress size={20} sx={{ my: 3 }} /></StyledTableCell></TableRow>
                            ) : visibleRows.length ? (
                                visibleRows.map((row, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell>{row.workhouse_name}</StyledTableCell>
                                        <StyledTableCell>{row.course_title}</StyledTableCell>
                                        <StyledTableCell>{row.teacher_name}</StyledTableCell>
                                        <StyledTableCell>{`${row.course_hours} saat`}</StyledTableCell>
                                        <StyledTableCell>{format(new Date(row.class_start_date_time), 'dd/MM/yyyy HH:mm')}</StyledTableCell>
                                        <StyledTableCell>{row.personnel_name}</StyledTableCell>

                                        <StyledTableCell>
                                            <Tooltip title="جزئیات و عملیات">
                                                <IconButton
                                                    id={`actions-button-${index}`}
                                                    onClick={(event) => handleClickMenu(event, row)}
                                                    color="secondary" size="small"
                                                >
                                                    <IconDots width={20} />
                                                </IconButton>
                                            </Tooltip>

                                            <Menu
                                                id="actions-menu" anchorEl={anchorEl}
                                                open={openMenu && selectedRowForMenu === row}
                                                onClose={handleCloseMenu}
                                            >
                                                <MenuItem onClick={() => handleOpenDetailViewModal(row)}>
                                                    <ListItemIcon><IconRuler width={18} /></ListItemIcon>
                                                    مشاهده‌ی جزئیات
                                                </MenuItem>
                                                <MenuItem onClick={() => handleExportPdfSingle(row)}>
                                                    <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                    دانلود PDF
                                                </MenuItem>
                                                <MenuItem onClick={() => handleExportExcelSingle(row)}>
                                                    <ListItemIcon><IconFileSpreadsheet width={18} /></ListItemIcon>
                                                    دانلود Excel
                                                </MenuItem>
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length + 1} align="center"><Typography variant="subtitle1" color="textSecondary" sx={{ my: 2 }}>Filtrelenen kritere uygun personel/kurs raporu bulunamadı.</Typography></StyledTableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <>
                    {reportData && reportData.data?.length > 0 && (
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50, 100]}
                            component="div"
                            count={filteredReportData.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            labelRowsPerPage="تعداد ردیف‌ها:"
                            labelDisplayedRows={({ from, to, count }) =>
                                `${from}–${to} / ${count !== -1 ? count : `> ${to}`}`
                            }
                        />
                    )}
                </>

            </BlankCard>
            <DetailViewModal
                open={openDetailViewModal} onClose={handleCloseDetailViewModal}
                report={selectedReportToDownload} onExportExcel={handleExportExcelSingle} onExportPdf={handleExportPdfSingle}
            />

        </Box>
    );
};

export default ListPersonalCourse;