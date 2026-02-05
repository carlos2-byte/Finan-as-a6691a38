import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface ExportResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Check if running on native Android/iOS
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Export data to a file - uses native filesystem on Android, web download otherwise
 */
export async function exportToFile(
  data: string,
  filename: string
): Promise<ExportResult> {
  if (isNativePlatform()) {
    return exportNative(data, filename);
  }
  return exportWeb(data, filename);
}

/**
 * Native export using Capacitor Filesystem - saves to Downloads
 */
async function exportNative(data: string, filename: string): Promise<ExportResult> {
  try {
    // On Android, we save to the Documents directory which is accessible
    // The Downloads directory requires additional permissions on newer Android versions
    const result = await Filesystem.writeFile({
      path: filename,
      data: data,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    // Try to also save to external storage for easier access
    try {
      await Filesystem.writeFile({
        path: `Download/${filename}`,
        data: data,
        directory: Directory.ExternalStorage,
        encoding: Encoding.UTF8,
      });
      
      return {
        success: true,
        path: `Downloads/${filename}`,
      };
    } catch {
      // If external storage fails, the Documents save still worked
      return {
        success: true,
        path: result.uri,
      };
    }
  } catch (error) {
    console.error('Native export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao salvar arquivo',
    };
  }
}

/**
 * Web export using blob download
 */
function exportWeb(data: string, filename: string): ExportResult {
  try {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return {
      success: true,
      path: filename,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao exportar',
    };
  }
}
