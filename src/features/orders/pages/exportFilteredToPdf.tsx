import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { NotoSansRegular } from 'src/shared/assets/fonts/NotoSans-Regular';
import Logo from 'src/shared/assets/images/logos/logo.png';

interface OrderType {
    id: number;
    network: { id: string; title: string; };
    docDate: string;
    status: number;
    orderDetails: OrderDetailType[];
}
interface OrderDetailType {
    id: number;
    item: { id: string; name: string; unit: { title: string; }; };
    quantity: number;
    description: string;
    price: number;
}

const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        console.error("خطا در قالب‌بندی تاریخ:", e);
        return "تاریخ نامعتبر";
    }
};

const stripHtml = (htmlString: string): string => {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
};

const cleanAndFormatPrice = (priceInput: string | number | null | undefined): string => {
    if (priceInput === null || priceInput === undefined) {
        return '₺0.00';
    }
    const cleanedString = String(priceInput).replace(/[$,]/g, '');
    const numericValue = parseFloat(cleanedString);
    if (isNaN(numericValue)) {
        return '₺0.00';
    }
    const formattedPrice = numericValue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return formattedPrice.replace('$', '₺');
};

export const exportFilteredToPdf = (filteredOrders: OrderType[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');

    const header = (_pageNumber: number, _totalPages: number) => {
        doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
        doc.setFontSize(18);
        doc.text(`گزارش سفارش‌های فیلترشده`, pageWidth - 15, 30, { align: 'right' });
        doc.setFontSize(12);
        doc.text(`تاریخ: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });
    };

    const footer = (pageNumber: number, totalPages: number) => {
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`صفحه ${pageNumber} / ${totalPages}`, 15, pageHeight - 10);
        doc.text('امضا', pageWidth - 15, pageHeight - 10, { align: 'right' });
    };

    let startY = 70;

    if (filteredOrders.length === 0) {
        doc.text('Görüntülenecek sipariş bulunamadı.', pageWidth / 2, pageHeight / 2, { align: 'center' });
        doc.save(`Filtrelenmiş_Sipariş_Raporu.pdf`);
        return;
    }

    filteredOrders.forEach((order, index) => {
        const orderData = [
            ['شماره سفارش:', order.id.toString()],
            ['شبکه:', order.network?.title || '-'],
            ['تاریخ:', formatDateDisplay(order.docDate)],
            ['وضعیت:', order.status === 0 ? "Beklemede" : order.status === 1 ? "تأیید شد" : "Reddedildi"]
        ];

        autoTable(doc, {
            body: orderData,
            startY: startY,
            theme: 'plain',
            styles: { font: 'NotoSans', fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });

        const orderTableEnd = (doc as any).autoTable.previous.finalY;

        const itemRows = order.orderDetails.map(detail => [
            detail.item.name || '-',
            Number(detail.quantity).toFixed(2) || '-',
            detail.item.unit?.title || '-',
            stripHtml(detail.description) || '-',
            cleanAndFormatPrice(detail.price),
        ]);

        autoTable(doc, {
            head: [['نام کالا', 'مقدار', 'واحد', 'توضیحات', 'قیمت']],
            body: itemRows,
            startY: orderTableEnd + 5,
            theme: 'grid',
            styles: { font: 'NotoSans', fontSize: 10, cellPadding: 2 },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 20 }, 2: { cellWidth: 20 }, 3: { cellWidth: 45 }, 4: { cellWidth: 'auto' } },
            didDrawPage: (data: any) => {
                header(data.pageNumber, data.pageCount);
                footer(data.pageNumber, data.pageCount);
            },
            margin: { top: 50, bottom: 20 }
        });

        if (index < filteredOrders.length - 1) {
            doc.addPage();
            startY = 50;
        }
    });

    try {
        doc.save(`Filtrelenmiş_Sipariş_Raporu.pdf`);
    } catch (error: any) {
        console.error('خطا در ساخت PDF:', error);
    }
};