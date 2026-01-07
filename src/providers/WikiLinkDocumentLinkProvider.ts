/**
 * @fileoverview Document link provider for WikiLink navigation in VS Code.
 * Provides clickable links for WikiLink references in Markdown documents,
 * enabling navigation between linked files with testable interfaces.
 *
 * @author MDloggerForCode Team
 * @version 1.0.0
 */

import { WikiLinkProcessor, type ParsedWikiLink } from '../processors/WikiLinkProcessor';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import type { Position, Range, Uri, DocumentLink, TextDocument, DocumentLinkProvider } from '../types/vscode-test-types';

/**
 * Provides document links for WikiLink references in Markdown files.
 * Scans documents for [[Page Name]] patterns and converts them into clickable
 * VS Code document links for seamless navigation between files.
 *
 * @class WikiLinkDocumentLinkProvider
 * @implements {DocumentLinkProvider}
 */
export class WikiLinkDocumentLinkProvider implements DocumentLinkProvider {
    private wikiLinkProcessor: WikiLinkProcessor;
    private configurationManager?: ConfigurationManager;
    
    /**
     * Creates a new WikiLinkDocumentLinkProvider instance.
     *
     * @param configurationManager - Optional configuration manager for accessing extension settings
     */
    constructor(configurationManager?: ConfigurationManager) {
        this.configurationManager = configurationManager;

        // デフォルト設定でWikiLinkProcessorを初期化
        const slugStrategy = this.configurationManager?.getSlugStrategy() || 'passthrough';
        this.wikiLinkProcessor = new WikiLinkProcessor({
            slugStrategy: slugStrategy
        });
    }

    private async tryResolveLinkTarget(
        transformedName: string,
        parsedLink: ParsedWikiLink,
        extension: string,
        document: TextDocument
    ): Promise<Uri | null> {
        if (!this.resolveLinkTarget) {
            return null;
        }
        try {
            return await this.resolveLinkTarget({
                fileName: transformedName,
                parsedLink,
                extension,
                document
            });
        } catch (resolveError) {
            console.warn('Failed to resolve WikiLink target via resolver:', resolveError);
            return null;
        }
    }

    /**
     * Provides document links for WikiLink references in the given document.
     * Scans the document for [[Page Name]] patterns and converts them to clickable links.
     *
     * @param document - The text document to scan for WikiLinks
     * @returns Array of document links found in the document
     * @throws {Error} When link processing fails
     */
    async provideDocumentLinks(document: TextDocument): Promise<DocumentLink[]> {
        if (document.languageId !== 'markdown') {
            return [];
        }
        
        const links: DocumentLink[] = [];
        const text = document.getText();
        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
        
        let match;
        while ((match = wikiLinkRegex.exec(text)) !== null) {
            try {
                const linkText = match[1];
                const parsedLink = this.wikiLinkProcessor.parseWikiLink(linkText);

                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);

                const range = this.createRange ? this.createRange(startPos, endPos) : { start: startPos, end: endPos };

                const transformedName = this.wikiLinkProcessor.transformFileName(parsedLink.pageName);
                const extension = this.configurationManager?.getNoteExtension() || '.md';
                const vaultRoot = this.configurationManager?.getVaultRoot() || '';

                let targetUri: Uri | null = await this.tryResolveLinkTarget(
                    transformedName,
                    parsedLink,
                    extension,
                    document
                );

                if (!targetUri) {
                    const fullPath = vaultRoot
                        ? `${vaultRoot}/${transformedName}${extension}`
                        : `${transformedName}${extension}`;
                    targetUri = this.createUri ? this.createUri(fullPath) : {
                        path: fullPath,
                        fsPath: fullPath,
                        toString: () => fullPath
                    };
                }

                const documentLink = this.createDocumentLink ?
                    this.createDocumentLink(range, targetUri) :
                    { range, target: targetUri };

                links.push(documentLink);
            } catch (error) {
                // 無効なWikiLinkは無視
                continue;
            }
        }
        
        return links;
    }

    /** Factory function to create Range objects (overridden in VS Code implementation) */
    createRange?: (start: Position, end: Position) => Range;
    /** Factory function to create Uri objects (overridden in VS Code implementation) */
    createUri?: (path: string) => Uri;
    /** Factory function to create DocumentLink objects (overridden in VS Code implementation) */
    createDocumentLink?: (range: Range, target?: Uri) => DocumentLink;
    /** Optional resolver to locate existing note URIs (overridden in VS Code implementation) */
    resolveLinkTarget?: (params: {
        fileName: string;
        parsedLink: ParsedWikiLink;
        extension: string;
        document: TextDocument;
    }) => Promise<Uri | null>;
}
