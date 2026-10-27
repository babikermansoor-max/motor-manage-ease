# Motor Manage Ease

Create a complete, production-ready, fully responsive Arabic ERP & POS web application for an Auto Spare Parts Store ("مجموعة عمر عبد الله عبدالرحمن لقطع غيار السيارات الكورية").
The app must be completely functional in RTL (Right-to-Left) with rich dark-mode aesthetics (Slate-950 background, Emerald-500 accents, Amber-400 badges, smooth glassmorphism), using Cairo/Tajawal font, Tailwind CSS, Lucide React icons, and Shadcn UI components.
Use local state with LocalStorage persistence so it is 100% working out of the box with realistic mock data, with zero empty placeholders or TODOs.

### CORE SECTIONS & TABS (Sidebar / Bottom Nav):

1. **نقطة البيع (POS & Cashier)**:
   - Header with cashier name, shift time, and active store info.
   - Live multi-field search bar: filter by Part Name (اسم الاسبير), Part Number (رقم القطعة), OEM Code, Car Model (e.g. أكسنت, توسان, سبورتاج), and Barcode.
   - Category filter pills (الكل, المحرك, الفرامل, المساعدين والتعليق, الكهرباء والحساسات, السيور, الفلاتر).
   - Product Grid: Cards showing Part Number, Name, Brand (Mobis / Genuine), Compatible Models, Stock quantity (with red alert if low), Price in SDG (ج.س), and "إضافة للسلة" button.
   - Interactive Shopping Cart (سلة البيع):
     - Item row: Name, Part Number, unit price, qty increment/decrement buttons, delete button, total item price.
     - Customer selector dropdown (default: زبون عام / عميل نقدي) + quick add customer modal.
     - Payment method selector: كاش (Cash), بنكك (Bankak Transfer), آجل (Credit).
     - Subtotal, dynamic discount field (amount or %), and Net Total.
     - "إتمام وطباعة الفاتورة" button: Immediately decrements product stock in state, records sale in sales history, adds revenue to Treasury, and opens the Receipt Modal.
   - Professional Thermal Receipt Modal (80mm width):
     - Displays store header, invoice #, customer name, cashier, table of items, subtotal, discount, total, payment method, return policy note.
     - Buttons: "طباعة الفاتورة" (triggers window.print() formatted for 80mm thermal receipt), "مشاركة واتساب" (opens WhatsApp direct text), "نسخ نص الفاتورة", and "بدء بيع جديد".

2. **المخزون وقطع الغيار (Inventory Management)**:
   - Stats summary at top: Total items, Total inventory valuation cost, Valuation selling, Out-of-stock items count.
   - Filter & search bar + quick toggle for "أصناف أوشكت على النفاد".
   - Inventory Table: Barcode/Part Number, Name, Brand, Car Model, Category, Shelf Location (الموقع/الرف), Cost Price, Selling Price, Available Stock, Min Stock, Status badge, Actions (Edit, Delete, Stock Adjustment).
   - "إضافة قطعة غيار جديدة" Modal: complete validated form.
   - "استيراد من Excel" Modal: parse CSV/Excel table and bulk add to inventory.
   - "تصدير إلى Excel (.csv)": Downloads complete inventory with UTF-8 BOM encoding so Arabic names display cleanly in Microsoft Excel.

3. **المبيعات وسجل الفواتير (Sales & Invoices)**:
   - Table of all completed invoices: Invoice #, Date/Time, Customer, Payment method, Total, Cashier, Actions.
   - View Invoice Details modal with printable view and option to trigger Return (مرتجع مبيعات) which automatically restores stock and deducts money from treasury.

4. **المشتريات والموردين (Purchases & Suppliers)**:
   - Suppliers directory: Name, Phone, Company, Balance / Debt (المستحقات), and "سداد دفعة للمورد" modal with instant treasury deduction.
   - Purchase Invoice builder: select supplier, add parts, enter purchase cost and quantity, increases stock instantly upon save.

5. **العملاء وحسابات الآجل (Customers & Credit)**:
   - Customers directory: Name, Phone, Car Model, Outstanding Debt (ديون العميل), Loyalty Points.
   - Quick "تحصيل دين" modal that updates customer debt and deposits into Treasury.

6. **الخزينة والمالية (Treasury & Cash Flow)**:
   - Dashboard cards: Current Safe Balance (رصيد الخزينة الحالي), Total Cash Sales, Total Bankak Sales, Total Purchases, Total Expenses, Net Cash in Hand.
   - Cash movement log: table of all in/out transactions with filter by type (مبيعات, مشتريات, مصروفات, سداد ديون).
   - "تسجيل مصروف جديد" modal (نثريات, إيجار, فواتير, عمالة).

7. **التقارير والتحليلات (Reports & Analytics)**:
   - Date range picker (From Date / To Date) with presets (اليوم, هذا الأسبوع, هذا الشهر).
   - Charts: Daily Sales Bar Chart, Sales by Payment Method Pie Chart, Top 5 Best-Selling Parts.
   - Financial Summary table: Gross Sales, Net Profit (Sales - Cost), Operating Expenses, Net Cash Profit.
   - Dual action buttons for all reports: "معاينة وطباعة التقرير" + "تصدير Excel (.csv)".

8. **الإعدادات والنسخ الاحتياطي (Settings & Backup)**:
   - Store settings: Store Name, Subtitle, Phone, Address, Currency Symbol (ج.س), Invoice Footer notes.
   - Export Full Database as JSON backup & Import Database JSON button.

### QUALITY & CODE DIRECTIVES:
- Ensure all numbers and currency are formatted properly with Arabic digits/locale.
- Every modal must close cleanly on backdrop click or close button.
- Make all buttons functional with realistic mock data on first load.
- Ensure 100% responsiveness on mobile devices (floating bottom cart button on mobile).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://motor-manage-ease.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ee2e0f95-22d3-4b41-bcdc-c3f07e467346).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
