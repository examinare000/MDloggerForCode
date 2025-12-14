/**
 * @fileoverview Configuration management for MDloggerForCode extension.
 * Provides type-safe configuration access, validation, and change monitoring.
 *
 * @author MDloggerForCode Team
 * @version 1.0.0
 */

/**
 * Strategy for transforming WikiLink page names into file names.
 * - 'passthrough': Keep original name unchanged
 * - 'kebab-case': Convert to kebab-case (lowercase with hyphens)
 * - 'snake_case': Convert to snake_case (lowercase with underscores)
 */
export type SlugStrategy = 'passthrough' | 'kebab-case' | 'snake_case';

/**
 * Complete configuration object for the MDloggerForCode extension.
 * Contains all user-configurable settings with their current values.
 */
export interface MdlgConfiguration {
    readonly vaultRoot: string;
    readonly noteExtension: string;
    readonly slugStrategy: SlugStrategy;
    readonly dateFormat: string;
    readonly timeFormat: string;
    readonly template: string;
    readonly dailyNoteTemplate: string;
    readonly dailyNotePath: string;
    readonly dailyNoteEnabled: boolean;
    readonly listContinuationEnabled: boolean;
    readonly searchSubdirectories: boolean;
    readonly notesFolder: string;
    readonly dailyNoteFormat: string;
    readonly captureSectionName: string;
}

/**
 * Represents a configuration validation error.
 * Used when a configuration value is invalid and prevents normal operation.
 */
export interface ValidationError {
    readonly field: keyof MdlgConfiguration;
    readonly message: string;
    readonly code: string;
}

/**
 * Represents a configuration validation warning.
 * Used when a configuration value is suboptimal but doesn't prevent operation.
 */
export interface ValidationWarning {
    readonly field: keyof MdlgConfiguration;
    readonly message: string;
    readonly recommendedValue?: string;
}

/**
 * Result of configuration validation containing errors and warnings.
 */
export interface ValidationResult {
    readonly isValid: boolean;
    readonly errors: ValidationError[];
    readonly warnings: ValidationWarning[];
}

/**
 * Interface for objects that can be disposed to clean up resources.
 */
export interface Disposable {
    dispose(): void;
}

/**
 * Interface for VS Code workspace configuration access.
 * Provides methods to get, check, and update configuration values.
 */
export interface WorkspaceConfiguration {
    get<T>(key: string, defaultValue?: T): T;
    has(key: string): boolean;
    update(key: string, value: string | number | boolean | object | null): Promise<void> | PromiseLike<void>;
}

/**
 * Manages extension configuration with validation and change monitoring.
 * Provides type-safe access to all extension settings and validates configuration values.
 *
 * @class ConfigurationManager
 */
export class ConfigurationManager {
    private static readonly configSection = 'mdlg';
    private changeListeners: ((config: MdlgConfiguration) => void)[] = [];
    
    /**
     * Creates a new ConfigurationManager instance.
     *
     * @param config - VS Code workspace configuration object
     */
    constructor(private config: WorkspaceConfiguration) {}

    /**
     * Gets the vault root directory path.
     *
     * @returns The configured vault root path, or empty string if not set
     */
    getVaultRoot(): string {
        return this.config.get<string>('vaultRoot', '');
    }

    /**
     * Gets the file extension for notes.
     *
     * @returns The configured note extension (default: '.md')
     */
    getNoteExtension(): string {
        return this.config.get<string>('noteExtension', '.md');
    }

    /**
     * Gets the slug transformation strategy for WikiLink file names.
     *
     * @returns The configured slug strategy (default: 'passthrough')
     */
    getSlugStrategy(): SlugStrategy {
        const strategy = this.config.get<string>('slugStrategy', 'passthrough');
        
        if (this.isValidSlugStrategy(strategy)) {
            return strategy as SlugStrategy;
        }
        
        return 'passthrough';
    }

    /**
     * Gets the date format string for date insertion.
     *
     * @returns The configured date format (default: 'YYYY-MM-DD')
     */
    getDateFormat(): string {
        return this.config.get<string>('dateFormat', 'YYYY-MM-DD');
    }

    /**
     * Gets the time format string for time insertion.
     *
     * @returns The configured time format (default: 'HH:mm')
     */
    getTimeFormat(): string {
        return this.config.get<string>('timeFormat', 'HH:mm');
    }

    /**
     * Gets the template content for new files.
     *
     * @returns The configured template content, or empty string if not set
     */
    getTemplate(): string {
        return this.config.get<string>('template', '');
    }

    /**
     * Gets the template path for daily notes.
     *
     * @returns The configured daily note template path, or empty string if not set
     */
    getDailyNoteTemplate(): string {
        return this.config.get<string>('dailyNoteTemplate', '');
    }

    /**
     * Gets the directory path for daily notes.
     *
     * @returns The configured daily note path (default: 'dailynotes')
     */
    getDailyNotePath(): string {
        return this.config.get<string>('dailyNotePath', 'dailynotes');
    }

    /**
     * Gets the notes folder (relative to vault root) used for daily notes and other notes.
     */
    getNotesFolder(): string {
        return this.config.get<string>('notesFolder', 'dailynotes');
    }

    /**
     * Gets the daily note file name format (e.g. "YYYY-MM-DD.md").
     */
    getDailyNoteFormat(): string {
        return this.config.get<string>('dailyNoteFormat', 'YYYY-MM-DD.md');
    }

    /**
     * Gets the section heading name inside daily notes where captured items will be appended.
     */
    getCaptureSectionName(): string {
        return this.config.get<string>('captureSectionName', 'Quick Notes');
    }

    /**
     * Checks if daily note functionality is enabled.
     *
     * @returns True if daily notes are enabled (default: true)
     */
    getDailyNoteEnabled(): boolean {
        return this.config.get<boolean>('dailyNoteEnabled', true);
    }

    /**
     * Checks if list continuation functionality is enabled.
     *
     * @returns True if list continuation is enabled (default: true)
     */
    getListContinuationEnabled(): boolean {
        return this.config.get<boolean>('listContinuationEnabled', true);
    }

    /**
     * Checks if subdirectory search is enabled when opening WikiLinks.
     *
     * @returns True if subdirectory search is enabled (default: true)
     */
    getSearchSubdirectories(): boolean {
        return this.config.get<boolean>('searchSubdirectories', true);
    }

    /**
     * Gets the complete configuration object.
     *
     * @returns Complete configuration with all current values
     */
    getConfiguration(): MdlgConfiguration {
        return {
            vaultRoot: this.getVaultRoot(),
            noteExtension: this.getNoteExtension(),
            slugStrategy: this.getSlugStrategy(),
            dateFormat: this.getDateFormat(),
            timeFormat: this.getTimeFormat(),
            template: this.getTemplate(),
            dailyNoteTemplate: this.getDailyNoteTemplate(),
            dailyNotePath: this.getDailyNotePath(),
            dailyNoteEnabled: this.getDailyNoteEnabled(),
            listContinuationEnabled: this.getListContinuationEnabled(),
            searchSubdirectories: this.getSearchSubdirectories()
            ,
            notesFolder: this.getNotesFolder(),
            dailyNoteFormat: this.getDailyNoteFormat(),
            captureSectionName: this.getCaptureSectionName()
        };
    }

    /**
     * Validates a partial configuration object.
     *
     * @param config - Partial configuration to validate
     * @returns Validation result with errors and warnings
     */
    validateConfiguration(config: Partial<MdlgConfiguration>): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // SlugStrategy validation
        if (config.slugStrategy !== undefined && !this.isValidSlugStrategy(config.slugStrategy)) {
            errors.push({
                field: 'slugStrategy',
                message: `Invalid slug strategy: ${config.slugStrategy}`,
                code: 'INVALID_SLUG_STRATEGY'
            });
        }

        // VaultRoot validation
        if (config.vaultRoot !== undefined && config.vaultRoot === '') {
            warnings.push({
                field: 'vaultRoot',
                message: 'Vault root is empty, workspace root will be used',
                recommendedValue: 'Set a specific vault path'
            });
        }

        // DateFormat validation
        if (config.dateFormat !== undefined && !this.isValidDateFormat(config.dateFormat)) {
            errors.push({
                field: 'dateFormat',
                message: `Invalid date format: ${config.dateFormat}`,
                code: 'INVALID_DATE_FORMAT'
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Registers a callback for configuration changes.
     *
     * @param callback - Function to call when configuration changes
     * @returns Disposable to unregister the callback
     */
    onConfigurationChanged(callback: (config: MdlgConfiguration) => void): Disposable {
        this.changeListeners.push(callback);
        
        return {
            dispose: () => {
                const index = this.changeListeners.indexOf(callback);
                if (index >= 0) {
                    this.changeListeners.splice(index, 1);
                }
            }
        };
    }

    /**
     * Manually triggers configuration change callbacks.
     * Used for testing - in production, VS Code API events trigger this automatically.
     */
    triggerConfigurationChanged(): void {
        const config = this.getConfiguration();
        this.changeListeners.forEach(listener => listener(config));
    }

    /**
     * Type guard to check if a string is a valid slug strategy.
     *
     * @param strategy - The string to check
     * @returns True if the strategy is valid
     */
    private isValidSlugStrategy(strategy: string): strategy is SlugStrategy {
        return ['passthrough', 'kebab-case', 'snake_case'].includes(strategy);
    }

    /**
     * Validates a date format string.
     *
     * @param format - The date format string to validate
     * @returns True if the format contains valid tokens
     */
    private isValidDateFormat(format: string): boolean {
        // 基本的な日付フォーマットトークンの検証
        const validTokens = ['YYYY', 'YY', 'MM', 'M', 'DD', 'D'];
        const formatTokens = format.match(/[A-Z]+/g) || [];
        
        // 空の場合やトークンが見つからない場合は無効
        if (formatTokens.length === 0) {
            return false;
        }
        
        return formatTokens.every(token => validTokens.includes(token));
    }
}
