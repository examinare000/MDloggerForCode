/**
 * @fileoverview Date and time formatting utilities for MDloggerForCode extension.
 * Provides flexible date/time formatting with custom token support, validation,
 * and extensible formatter registration for various output formats.
 *
 * @author MDloggerForCode Team
 * @version 1.0.0
 */

/**
 * Result of format string validation.
 * Contains validation status and error information if validation fails.
 */
export interface FormatValidationResult {
    readonly isValid: boolean;
    readonly error?: string;
}

/**
 * Function type for custom date/time formatters.
 * Takes a Date object and returns a formatted string representation.
 */
export type CustomFormatterFunction = (date: Date) => string;

/**
 * Flexible date and time formatter with custom token support.
 * Supports standard date/time tokens (YYYY, MM, DD, HH, mm, ss, etc.)
 * and allows registration of custom formatting functions for specialized needs.
 *
 * @class DateTimeFormatter
 */
export class DateTimeFormatter {
    private customFormatters: Map<string, CustomFormatterFunction> = new Map();

    /**
     * Formats a date using the specified format string.
     *
     * @param date - The date to format
     * @param format - Format string with tokens (e.g., 'YYYY-MM-DD')
     * @returns Formatted date string
     * @throws {Error} When format string is invalid
     */
    formatDate(date: Date, format: string): string {
        return this.applyFormatTokens(date, format);
    }

    /**
     * Formats a time using the specified format string.
     *
     * @param date - The date object containing the time to format
     * @param format - Format string with tokens (e.g., 'HH:mm:ss')
     * @returns Formatted time string
     * @throws {Error} When format string is invalid
     */
    formatTime(date: Date, format: string): string {
        return this.applyFormatTokens(date, format);
    }

    /**
     * Registers a custom formatter for a specific token.
     *
     * @param token - The token string to register (e.g., 'CUSTOM')
     * @param formatter - Function that formats the date for this token
     */
    addCustomFormatter(token: string, formatter: CustomFormatterFunction): void {
        this.customFormatters.set(token, formatter);
    }

    /**
     * Validates a format string for correctness.
     * Checks that all tokens in the format string are recognized.
     *
     * @param format - The format string to validate
     * @returns Validation result with error details if invalid
     */
    validateFormat(format: string): FormatValidationResult {
        if (!format || format.trim() === '') {
            return {
                isValid: false,
                error: 'Format string cannot be empty'
            };
        }

        const tokens = format.match(/[A-Z]+/g) || [];
        const validTokens = ['YYYY', 'YY', 'MM', 'M', 'DD', 'D', 'HH', 'H', 'hh', 'h', 'mm', 'm', 'ss', 's', 'A', 'a'];
        
        for (const token of tokens) {
            if (!validTokens.includes(token) && !this.customFormatters.has(token)) {
                return {
                    isValid: false,
                    error: `Unknown format token: ${token}`
                };
            }
        }

        return { isValid: true };
    }

    /**
     * Applies format tokens to a date, replacing tokens with formatted values.
     *
     * @param date - The date to format
     * @param format - The format string containing tokens
     * @returns Formatted string with tokens replaced
     */
    private applyFormatTokens(date: Date, format: string): string {
        const tokenMappings = this.buildTokenMappings(date);
        return this.replaceTokensInFormat(format, tokenMappings);
    }

    /**
     * Builds a sorted array of token-to-value mappings for the given date.
     * Longer tokens are sorted first to prevent partial token replacement.
     *
     * @param date - The date to generate mappings for
     * @returns Sorted array of token mappings
     */
    private buildTokenMappings(date: Date): Array<{ token: string; value: string }> {
        const standardTokens = this.getStandardTokens(date);
        const customTokens = this.getCustomTokens(date);
        
        const allTokens = [...standardTokens, ...customTokens];
        
        // 長さの降順でソート（長いトークンから先に処理）
        return allTokens.sort((a, b) => b.token.length - a.token.length);
    }

    /**
     * Gets standard date/time token mappings.
     *
     * @param date - The date to generate standard tokens for
     * @returns Array of standard token mappings
     */
    private getStandardTokens(date: Date): Array<{ token: string; value: string }> {
        return [
            { token: 'YYYY', value: date.getFullYear().toString() },
            { token: 'MM', value: this.padZero(date.getMonth() + 1, 2) },
            { token: 'DD', value: this.padZero(date.getDate(), 2) },
            { token: 'HH', value: this.padZero(date.getHours(), 2) },
            { token: 'hh', value: this.padZero(this.to12Hour(date.getHours()), 2) },
            { token: 'mm', value: this.padZero(date.getMinutes(), 2) },
            { token: 'ss', value: this.padZero(date.getSeconds(), 2) },
            { token: 'YY', value: date.getFullYear().toString().slice(-2) },
            { token: 'M', value: (date.getMonth() + 1).toString() },
            { token: 'D', value: date.getDate().toString() },
            { token: 'H', value: date.getHours().toString() },
            { token: 'h', value: this.to12Hour(date.getHours()).toString() },
            { token: 'm', value: date.getMinutes().toString() },
            { token: 's', value: date.getSeconds().toString() },
            { token: 'A', value: date.getHours() >= 12 ? 'PM' : 'AM' },
            { token: 'a', value: date.getHours() >= 12 ? 'pm' : 'am' }
        ];
    }

    /**
     * Gets custom token mappings from registered formatters.
     *
     * @param date - The date to generate custom tokens for
     * @returns Array of custom token mappings
     */
    private getCustomTokens(date: Date): Array<{ token: string; value: string }> {
        const customTokens: Array<{ token: string; value: string }> = [];
        
        for (const [token, formatter] of this.customFormatters) {
            customTokens.push({ token, value: formatter(date) });
        }
        
        return customTokens;
    }

    /**
     * Replaces tokens in the format string with their corresponding values.
     * Processes character by character to handle overlapping tokens correctly.
     *
     * @param format - The format string to process
     * @param tokenMappings - Array of token-to-value mappings
     * @returns Formatted string with tokens replaced
     */
    private replaceTokensInFormat(format: string, tokenMappings: Array<{ token: string; value: string }>): string {
        const chars = format.split('');
        const result: string[] = [];
        let i = 0;

        while (i < chars.length) {
            const matchedToken = this.findMatchingToken(chars, i, tokenMappings);
            
            if (matchedToken) {
                result.push(matchedToken.value);
                i += matchedToken.token.length;
            } else {
                result.push(chars[i]);
                i++;
            }
        }

        return result.join('');
    }

    /**
     * Finds a matching token at the specified position in the character array.
     *
     * @param chars - Array of characters from the format string
     * @param position - Current position to check for token matches
     * @param tokenMappings - Available token mappings
     * @returns Matching token mapping or null if no match found
     */
    private findMatchingToken(chars: string[], position: number, tokenMappings: Array<{ token: string; value: string }>): { token: string; value: string } | null {
        for (const { token, value } of tokenMappings) {
            if (position + token.length <= chars.length) {
                const substring = chars.slice(position, position + token.length).join('');
                if (substring === token) {
                    return { token, value };
                }
            }
        }
        return null;
    }

    /**
     * Pads a number with leading zeros to the specified length.
     *
     * @param num - The number to pad
     * @param length - The desired string length
     * @returns Zero-padded string representation
     */
    private padZero(num: number, length: number): string {
        return num.toString().padStart(length, '0');
    }

    /**
     * Converts 24-hour format to 12-hour format.
     *
     * @param hour24 - Hour in 24-hour format (0-23)
     * @returns Hour in 12-hour format (1-12)
     */
    private to12Hour(hour24: number): number {
        if (hour24 === 0) {
            return 12; // 午前0時は12AM
        }
        if (hour24 <= 12) {
            return hour24; // 午前1時〜午後12時
        }
        return hour24 - 12; // 午後1時〜午後11時
    }
}
