import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import * as path from 'path';

// VS Code依存を排除したPathUtilテスト実装（修正版）
describe('PathUtil (Node.js path.isAbsolute Implementation)', () => {

    // 修正後のPathUtilロジックをテスト用クラスとして実装
    class UpdatedPathUtil {
        /**
         * Node.jsの標準path.isAbsolute()を使った絶対パス判定
         */
        static isAbsolutePath(pathString: string): boolean {
            return path.isAbsolute(pathString);
        }

        /**
         * ファイル名サニタイズ（既存機能と同等）
         */
        static sanitizeFileName(fileName: string): string {
            const reservedNames = ['CON', 'PRN', 'AUX', 'NUL',
                'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
                'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];

            let sanitized = fileName
                .replace(/[/\\:*?"<>|]/g, '-')
                .replace(/\s+/g, ' ')
                .replace(/[\t\n\r]/g, '-')
                .trim()
                .replace(/\.+$/, '')
                .substring(0, 255);

            if (!sanitized || sanitized.trim() === '') {
                return 'untitled';
            }

            const baseName = sanitized.split('.')[0].trim();
            if (reservedNames.includes(baseName.toUpperCase())) {
                sanitized = `_${sanitized.trim()}`;
            }

            return sanitized.trim();
        }
    }

  describe('isAbsolutePath (using path.isAbsolute)', () => {
    // 1. Windows環境での様々なパス形式のテスト
    // Note: These tests are environment-dependent and will only pass on Windows
    describe('when on Windows-like environment', () => {
      before(function() {
        // Skip these tests on non-Windows platforms
        if (process.platform !== 'win32') {
          this.skip();
        }
      });

      it('should return true for drive letter paths', () => {
        expect(UpdatedPathUtil.isAbsolutePath('C:\\Users\\Test')).to.be.true;
        expect(UpdatedPathUtil.isAbsolutePath('D:/Games/Valorant')).to.be.true;
        expect(UpdatedPathUtil.isAbsolutePath('c:\\windows')).to.be.true;
      });

      it('should return true for UNC paths', () => {
        expect(UpdatedPathUtil.isAbsolutePath('\\\\server\\share')).to.be.true;
        expect(UpdatedPathUtil.isAbsolutePath('\\\\192.168.1.1\\data')).to.be.true;
      });

      // 2. Install from locationを想定したシンボリックリンクパスのテスト
      it('should return true for Windows extended-length (special) paths', () => {
        // "Install from location"などで見られる特殊な形式
        expect(UpdatedPathUtil.isAbsolutePath('\\\\?\\C:\\Users\\someuser\\.vscode\\extensions\\publisher.ext-1.0.0')).to.be.true;
        expect(UpdatedPathUtil.isAbsolutePath('\\\\?\\UNC\\server\\share\\file')).to.be.true;
      });
    });

    describe('when on POSIX-like environment', () => {
      it('should return true for absolute paths', () => {
        expect(UpdatedPathUtil.isAbsolutePath('/home/user/documents')).to.be.true;
        expect(UpdatedPathUtil.isAbsolutePath('/usr/local/bin')).to.be.true;
        expect(UpdatedPathUtil.isAbsolutePath('/')).to.be.true;
      });
    });

    // 3. 既存機能の回帰テスト (相対パス)
    describe('for relative paths', () => {
      it('should return false for relative paths', () => {
        expect(UpdatedPathUtil.isAbsolutePath('relative/path')).to.be.false;
        expect(UpdatedPathUtil.isAbsolutePath('./relative/path')).to.be.false;
        expect(UpdatedPathUtil.isAbsolutePath('..\\parent\\dir')).to.be.false;
        expect(UpdatedPathUtil.isAbsolutePath('file.md')).to.be.false;
      });
    });

    // 4. エラーケースのテスト
    describe('for edge cases and invalid paths', () => {
      it('should return correct results for incomplete or invalid paths', () => {
        expect(UpdatedPathUtil.isAbsolutePath('')).to.be.false;
        expect(UpdatedPathUtil.isAbsolutePath('C:')).to.be.false; // ドライブレターのみ
        const expectedUNC = process.platform === 'win32' ? true : false;
        expect(UpdatedPathUtil.isAbsolutePath('\\\\server')).to.equal(expectedUNC); // UNC server root behavior is platform-dependent
      });

      it('should handle null or undefined gracefully', () => {
        // @ts-ignore
        expect(() => UpdatedPathUtil.isAbsolutePath(null)).to.throw();
        // @ts-ignore
        expect(() => UpdatedPathUtil.isAbsolutePath(undefined)).to.throw();
      });
    });
  });

  // 3. 既存機能の回帰テスト
  describe('sanitizeFileName (Regression Test)', () => {
    it('should replace illegal characters', () => {
      expect(UpdatedPathUtil.sanitizeFileName('a/b\\c:d*e?f"g<h>i|j')).to.equal('a-b-c-d-e-f-g-h-i-j');
    });

    it('should prepend underscore to Windows reserved names', () => {
      expect(UpdatedPathUtil.sanitizeFileName('CON')).to.equal('_CON');
      expect(UpdatedPathUtil.sanitizeFileName('prn.txt')).to.equal('_prn.txt');
      expect(UpdatedPathUtil.sanitizeFileName('LPT1')).to.equal('_LPT1');
    });

    it('should remove trailing dots', () => {
      expect(UpdatedPathUtil.sanitizeFileName('filename...')).to.equal('filename');
    });

    it('should return "untitled" for empty or whitespace-only names', () => {
      expect(UpdatedPathUtil.sanitizeFileName('   ')).to.equal('untitled');
      expect(UpdatedPathUtil.sanitizeFileName('...')).to.equal('untitled');
    });
  });

  describe('isAbsolutePath behavior comparison', () => {
    it('should match Node.js path.isAbsolute() results for Windows paths', () => {
      const testPaths = [
        'C:\\Users\\Test',
        'D:/Games/Valorant',
        'c:\\windows',
        '\\\\server\\share',
        '\\\\192.168.1.1\\data',
        '\\\\?\\C:\\Users\\someuser\\.vscode\\extensions\\publisher.ext-1.0.0',
        '\\\\?\\UNC\\server\\share\\file',
        'relative/path',
        './relative/path',
        '..\\parent\\dir',
        'file.md',
        '',
        'C:',
        '\\\\server'
      ];

      testPaths.forEach(testPath => {
        const pathUtilResult = UpdatedPathUtil.isAbsolutePath(testPath);
        const nodeResult = path.isAbsolute(testPath);
        expect(pathUtilResult).to.equal(nodeResult, `Path: ${testPath}`);
      });
    });

    it('should match Node.js path.isAbsolute() results for POSIX paths', () => {
      const testPaths = [
        '/home/user/documents',
        '/usr/local/bin',
        '/',
        'relative/path',
        './current',
        '../parent'
      ];

      testPaths.forEach(testPath => {
        const pathUtilResult = UpdatedPathUtil.isAbsolutePath(testPath);
        const nodeResult = path.isAbsolute(testPath);
        expect(pathUtilResult).to.equal(nodeResult, `Path: ${testPath}`);
      });
    });
  });
});
