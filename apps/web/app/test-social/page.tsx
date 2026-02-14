'use client';

// TODO: delete this page

import { useState } from 'react';
import { logger } from '@/lib/logger';

const TestSocialPage = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState('');

  const testSocialPosting = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/social/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test'}`,
        },
        body: JSON.stringify({
          slug: slug || undefined,
          platforms: ['instagram', 'facebook'],
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      logger.error(
        'Failed to test social posting',
        { page: 'test-social' },
        error instanceof Error ? error : undefined,
      );
      setResult({ error: 'Failed to test social posting', details: error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">🧪 Test Social Media Posting</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          {}
          <label
            htmlFor="slug"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Blog Post Slug (leave empty for most recent)
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="understanding-pcn-codes"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="button"
          onClick={testSocialPosting}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {loading ? '🔄 Testing...' : '🚀 Test Social Posting'}
        </button>
      </div>

      {result && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Test Results</h2>

          <div className="mb-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                result.success
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {result.success ? '✅ Success' : '❌ Failed'}
            </span>
          </div>

          {result.post && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-700">📝 Post Details:</h3>
              <p className="text-sm text-gray-600">
                Title: {result.post.title}
              </p>
              <p className="text-sm text-gray-600">Slug: {result.post.slug}</p>
            </div>
          )}

          {result.results?.instagram && (
            <div className="mb-4 p-4 bg-white rounded border">
              <h3 className="font-medium text-gray-700 mb-2">📱 Instagram</h3>
              <p
                className={`text-sm ${result.results.instagram.success ? 'text-green-600' : 'text-red-600'}`}
              >
                Status:{' '}
                {result.results.instagram.success
                  ? 'Posted Successfully'
                  : 'Failed'}
              </p>
              {result.results.instagram.mediaId && (
                <p className="text-sm text-gray-600">
                  Media ID: {result.results.instagram.mediaId}
                </p>
              )}
              {result.results.instagram.caption && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Caption:</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
                    {result.results.instagram.caption.substring(0, 200)}...
                  </p>
                </div>
              )}
              {result.results.instagram.error && (
                <p className="text-sm text-red-600">
                  Error: {result.results.instagram.error}
                </p>
              )}
            </div>
          )}

          {result.results?.facebook && (
            <div className="mb-4 p-4 bg-white rounded border">
              <h3 className="font-medium text-gray-700 mb-2">📘 Facebook</h3>
              <p
                className={`text-sm ${result.results.facebook.success ? 'text-green-600' : 'text-red-600'}`}
              >
                Status:{' '}
                {result.results.facebook.success
                  ? 'Posted Successfully'
                  : 'Failed'}
              </p>
              {result.results.facebook.postId && (
                <p className="text-sm text-gray-600">
                  Post ID: {result.results.facebook.postId}
                </p>
              )}
              {result.results.facebook.caption && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Caption:</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
                    {result.results.facebook.caption.substring(0, 200)}...
                  </p>
                </div>
              )}
              {result.results.facebook.error && (
                <p className="text-sm text-red-600">
                  Error: {result.results.facebook.error}
                </p>
              )}
            </div>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              🔍 Raw Response
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default TestSocialPage;
