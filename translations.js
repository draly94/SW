// translations.js
export const translations = {
    en: {
        // Sidebar / Navigation
        overview: "Overview",
        patients: "Patients",
        appointments: "Appointments",
        staff: "Staff",
        inventory: "Inventory",
        profile: "Profile",
        settings: "Settings",
        signout: "Sign Out",
        workspace: "Workspace",
        // connection error
        connectionErrorTitle:"Connection issue",
        connectionErrorBody:"It’s taking longer than usual to load your data.",
        connectionErrorBtn:"Try Again",
        // Common Actions
        save: "Save",
        cancel: "Cancel",
        add: "Add",
        addItem: "Add Item",
        updateStock: "Update Stock",
        delete: "Delete",
        
        // overview page
        overviewWelcome: "Welcome back ",
        
        // Settings Page
        appearance: "Appearance",
        light: "Light",
        dark: "Dark",
        systemMatch: "System Match",
        language: "Language",
        branchPreferences: "Branch & System Preferences",
        inventoryConfig: "Inventory Configuration",
        pricingConfig: "Pricing Configuration",
        manageCats: "Manage categories and sub-categories",
        managePricing: "Manage pricing tiers and groups"
    },
    ar: {
        // Sidebar / Navigation
        overview: "نظرة عامة",
        patients: "المرضى",
        appointments: "المواعيد",
        staff: "الموظفين",
        inventory: "المخزون",
        profile: "الملف الشخصي",
        settings: "الإعدادات",
        signout: "تسجيل الخروج",
        workspace: "مساحة العمل",
        // connection error
        connectionErrorTitle:"مشكلة في الاتصال",
        connectionErrorBody:"يستغرق تحميل بياناتك وقتاً أطول من المعتاد.",
        connectionErrorBtn:"إعادة المحاولة",
        
        // Common Actions
        save: "حفظ",
        cancel: "إلغاء",
        add: "إضافة",
        addItem: "إضافة عنصر",
        updateStock: "تحديث المخزون",
        delete: "حذف",
        
        // overview page
        overviewWelcome:"مرحبا بك ",

        // Settings Page
        appearance: "المظهر",
        light: "فاتح",
        dark: "داكن",
        systemMatch: "تطابق الجهاز",
        language: "اللغة",
        branchPreferences: "تفضيلات الفرع والنظام",
        inventoryConfig: "تكوين المخزون",
        pricingConfig: "تكوين التسعير",
        manageCats: "إدارة الفئات والفئات الفرعية",
        managePricing: "إدارة فئات ومجموعات التسعير"
    }
};

/**
 * Helper function to get translated text
 * @param {string} key - The translation key
 * @param {string} lang - Current language ('en' or 'ar')
 */
export function t(key, lang = 'en') {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
}
