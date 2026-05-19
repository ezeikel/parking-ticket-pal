/**
 * Buffer GraphQL API bridge — TEMPORARY.
 *
 * Why this exists: TikTok and LinkedIn auto-posting both require a direct
 * API integration that's still pending platform approval (TikTok App Review,
 * LinkedIn rejected on first pass). Until those land, this module pushes the
 * already-generated caption + public asset URL into Buffer's queue via its
 * GraphQL API, scheduled at the same UTC slot the post would have gone out.
 *
 * When direct approval lands: flip BUFFER_ENABLE_TIKTOK / BUFFER_ENABLE_LINKEDIN
 * off (or remove the env vars entirely), then delete this file and its callers.
 * The direct-post code paths are kept intact for exactly that day.
 *
 * Self-contained on purpose — no imports from app code — so the same file can
 * be copied verbatim into other repos (PTP) that need the same bridge.
 *
 * Asset format note: Buffer's old grouped `AssetsInput` is removed after
 * 2026-05-25; this uses the new `[AssetInput!]!` (@oneOf) format from day one.
 * Buffer fetches media from a public URL — it does NOT accept uploads — and
 * for TikTok the URL must stay live until the post actually publishes, not
 * just until it's scheduled. Our assets are durable public R2 URLs, so fine.
 *
 * Docs: https://developers.buffer.com
 */

const BUFFER_GRAPHQL_ENDPOINT = 'https://api.buffer.com';

export type BufferPlatform = 'tiktok' | 'linkedin';

/** Buffer's `service` enum value for a channel, lowercased for matching. */
const SERVICE_FOR_PLATFORM: Record<BufferPlatform, string> = {
  tiktok: 'tiktok',
  linkedin: 'linkedin',
};

export type BufferBridgeResult = {
  /** true only when Buffer accepted the post into its queue. */
  scheduled: boolean;
  /** Buffer's post id, when scheduled. */
  postId?: string;
  /** Channel the post landed on, when scheduled. */
  channelId?: string;
  /** Human-readable reason when not scheduled (disabled, no key, API error). */
  error?: string;
  /** true when the bridge was deliberately off for this platform (not a failure). */
  disabled?: boolean;
};

/**
 * Per-platform enable check. The bridge is active for a platform only when
 * BOTH a Buffer API key is present AND that platform's enable flag is on.
 * Default-off: a missing flag means disabled (safe — nothing posts via Buffer
 * unless explicitly switched on).
 */
export const isBufferBridgeEnabled = (platform: BufferPlatform): boolean => {
  if (!process.env.BUFFER_API_KEY) return false;
  const flag =
    platform === 'tiktok'
      ? process.env.BUFFER_ENABLE_TIKTOK
      : process.env.BUFFER_ENABLE_LINKEDIN;
  return flag === 'true' || flag === '1';
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

const bufferGraphQL = async <T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> => {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) throw new Error('BUFFER_API_KEY not set');

  const res = await fetch(BUFFER_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Buffer API ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(
      `Buffer GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`,
    );
  }
  if (!json.data) throw new Error('Buffer GraphQL: empty data');
  return json.data;
};

type BufferOrganization = { id: string; name?: string };
type BufferChannel = {
  id: string;
  service: string;
  displayName?: string;
  name?: string;
};

// Real Buffer schema: there is NO top-level `organizations` query — orgs
// hang off `account`. (The public docs example showing `organizations { id }`
// is wrong; the API rejects it.) channels(input:) takes an OrganizationId
// scalar, passed here as a String variable which the scalar coerces.
const GET_ACCOUNT_ORGS = /* GraphQL */ `
  query GetAccountOrgs {
    account {
      organizations {
        id
        name
      }
    }
  }
`;

const GET_CHANNELS = /* GraphQL */ `
  query GetChannels($organizationId: OrganizationId!) {
    channels(input: { organizationId: $organizationId }) {
      id
      service
      displayName
      name
    }
  }
`;

/**
 * Resolve the Buffer channel id for a platform. Buffer's API key is
 * account-scoped (no per-org scoping), so we walk every organization and
 * pick the first channel whose `service` matches the platform.
 *
 * If you have multiple channels of the same service across brands under one
 * Buffer account, set BUFFER_CHANNEL_ID_TIKTOK / BUFFER_CHANNEL_ID_LINKEDIN
 * to pin an exact channel id and skip discovery entirely.
 */
export const resolveChannelId = async (
  platform: BufferPlatform,
): Promise<string> => {
  const pinned =
    platform === 'tiktok'
      ? process.env.BUFFER_CHANNEL_ID_TIKTOK
      : process.env.BUFFER_CHANNEL_ID_LINKEDIN;
  if (pinned) return pinned;

  const { account } = await bufferGraphQL<{
    account: { organizations: BufferOrganization[] };
  }>(GET_ACCOUNT_ORGS, {});
  const organizations = account?.organizations ?? [];

  const wanted = SERVICE_FOR_PLATFORM[platform];

  // Fetch every org's channels in parallel (faster than serial, and keeps
  // this loop-free for repos whose lint forbids for-of). Flatten, then
  // pick the first channel whose service matches the platform.
  const channelLists = await Promise.all(
    organizations.map((org) =>
      bufferGraphQL<{ channels: BufferChannel[] }>(GET_CHANNELS, {
        organizationId: org.id,
      }).then((d) => d.channels),
    ),
  );
  const match = channelLists
    .flat()
    .find((c) => c.service?.toLowerCase() === wanted);
  if (match) return match.id;

  throw new Error(
    `No Buffer channel found for service "${wanted}". Connect the channel in Buffer or set the pin env var.`,
  );
};

/**
 * List every connected Buffer channel across all organizations on the
 * account, with the org it belongs to. Used by the channel-ID lookup
 * script so you can copy the exact ids into BUFFER_CHANNEL_ID_TIKTOK /
 * BUFFER_CHANNEL_ID_LINKEDIN per app (CC and PTP share one Buffer
 * account, so the ids must be pinned to avoid cross-posting).
 */
export const listBufferChannels = async (): Promise<
  {
    organizationId: string;
    organizationName?: string;
    id: string;
    service: string;
    displayName?: string;
    name?: string;
  }[]
> => {
  const { account } = await bufferGraphQL<{
    account: { organizations: BufferOrganization[] };
  }>(GET_ACCOUNT_ORGS, {});
  const organizations = account?.organizations ?? [];

  const perOrg = await Promise.all(
    organizations.map((org) =>
      bufferGraphQL<{ channels: BufferChannel[] }>(GET_CHANNELS, {
        organizationId: org.id,
      }).then((d) =>
        d.channels.map((c) => ({
          organizationId: org.id,
          organizationName: org.name,
          id: c.id,
          service: c.service,
          displayName: c.displayName,
          name: c.name,
        })),
      ),
    ),
  );
  return perOrg.flat();
};

const CREATE_POST = /* GraphQL */ `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess {
        post {
          id
          dueAt
        }
      }
      ... on MutationError {
        message
      }
    }
  }
`;

export type SchedulePostParams = {
  platform: BufferPlatform;
  /** Full caption text (already includes hashtags). */
  text: string;
  /** Public URL of the video to post. Must stay live until publish. */
  videoUrl: string;
  /** Optional public URL of a cover/thumbnail image for the video. */
  thumbnailUrl?: string;
  /**
   * When the post should publish. ISO 8601 UTC. We use Buffer's
   * `customScheduled` mode so it goes out at exactly this time rather than
   * whenever Buffer's own queue settings decide.
   */
  dueAt: Date;
};

/**
 * Build the createPost variables. Extracted (and exported) so it can be
 * unit-tested without hitting the network — the dueAt formatting and the
 * new @oneOf asset shaping are the parts a silent bug would quietly break.
 */
export const buildCreatePostVariables = (
  channelId: string,
  params: Pick<
    SchedulePostParams,
    'text' | 'videoUrl' | 'thumbnailUrl' | 'dueAt'
  >,
) => {
  const video: { url: string; thumbnailUrl?: string } = {
    url: params.videoUrl,
  };
  if (params.thumbnailUrl) video.thumbnailUrl = params.thumbnailUrl;

  return {
    input: {
      text: params.text,
      channelId,
      schedulingType: 'automatic',
      mode: 'customScheduled',
      // ISO 8601 UTC, no milliseconds — Buffer expects second precision.
      dueAt: params.dueAt.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      // New [AssetInput!]! @oneOf format (old grouped AssetsInput removed
      // after 2026-05-25). One asset object, `video` key only.
      assets: [{ video }],
    },
  };
};

/**
 * Push a single video post into Buffer's queue, scheduled for `dueAt`.
 * Never throws — returns a structured result the caller records into
 * socialPostResults / the digest so a Buffer outage degrades to "manual"
 * rather than crashing the whole social run.
 */
export const schedulePostViaBuffer = async (
  params: SchedulePostParams,
): Promise<BufferBridgeResult> => {
  if (!isBufferBridgeEnabled(params.platform)) {
    return {
      scheduled: false,
      disabled: true,
      error: `Buffer bridge disabled for ${params.platform}`,
    };
  }

  try {
    const channelId = await resolveChannelId(params.platform);
    const variables = buildCreatePostVariables(channelId, params);

    const data = await bufferGraphQL<{
      createPost: { post: { id: string; dueAt: string } } | { message: string };
    }>(CREATE_POST, variables);

    if ('message' in data.createPost) {
      return {
        scheduled: false,
        channelId,
        error: `Buffer rejected post: ${data.createPost.message}`,
      };
    }

    return {
      scheduled: true,
      postId: data.createPost.post.id,
      channelId,
    };
  } catch (error) {
    return {
      scheduled: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
