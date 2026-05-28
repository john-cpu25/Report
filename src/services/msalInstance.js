import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./authConfig";

/**
 * Singleton MSAL instance — shared across AuthContext & MsalProvider.
 * MSAL v5 yêu cầu gọi initialize() trước khi dùng bất kỳ method nào.
 * Export cả promise để đảm bảo initialization hoàn tất trước khi sử dụng.
 */
export const msalInstance = new PublicClientApplication(msalConfig);

// Khởi tạo ngay khi module load — các consumer await promise này
export const msalInitPromise = msalInstance.initialize();
