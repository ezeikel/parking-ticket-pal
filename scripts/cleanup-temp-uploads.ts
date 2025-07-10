import { list, del } from '@vercel/blob';

const cleanupTempUploads = async () => {
  const CUTOFF_TIME = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

  try {
    console.log('Starting cleanup of temporary uploads...');

    // list all temp files
    const { blobs } = await list({ prefix: 'temp/' });

    if (blobs.length === 0) {
      console.log('No temporary files found');
      return;
    }

    const now = new Date().getTime();
    const filesToDelete = blobs.filter((blob) => {
      // extract timestamp from path like: temp/userId/2025-01-15T10-30-45-123Z.jpg
      const pathParts = blob.pathname.split('/');
      const filename = pathParts[pathParts.length - 1];

      if (!filename) return false;

      // extract timestamp from filename (everything before the extension)
      const timestampStr = filename.split('.')[0];

      if (!timestampStr) return false;

      try {
        // convert timestamp back to Date (replace hyphens with colons for ISO format)
        const fileTime = new Date(timestampStr.replace(/-/g, ':')).getTime();
        return now - fileTime > CUTOFF_TIME;
      } catch (error) {
        console.warn(`Could not parse timestamp from filename: ${filename}`);
        return false;
      }
    });

    if (filesToDelete.length === 0) {
      console.log('No temporary files older than 48 hours found');
      return;
    }

    // delete old files
    console.log(`Found ${filesToDelete.length} temporary files to delete`);

    const deletePromises = filesToDelete.map(async (file) => {
      try {
        await del(file.url);
        console.log(`Deleted: ${file.pathname}`);
        return { success: true, path: file.pathname };
      } catch (error) {
        console.error(`Failed to delete ${file.pathname}:`, error);
        return { success: false, path: file.pathname, error };
      }
    });

    const results = await Promise.all(deletePromises);
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `Cleanup completed: ${successful} files deleted, ${failed} failed`,
    );

    if (failed > 0) {
      console.log(
        'Failed deletions:',
        results.filter((r) => !r.success),
      );
    }
  } catch (error) {
    console.error('Error cleaning up temp uploads:', error);
    throw error;
  }
};

// allow running directly
if (require.main === module) {
  cleanupTempUploads()
    .then(() => {
      console.log('Cleanup script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup script failed:', error);
      process.exit(1);
    });
}

export default cleanupTempUploads;
