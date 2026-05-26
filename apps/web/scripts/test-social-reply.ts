/**
 * Quick test script: queue a real FB comment and process it via the AI reply pipeline.
 *
 * Usage: npx tsx scripts/test-social-reply.ts
 *
 * Set DRY_RUN=false to actually post the reply to Facebook.
 */

import { generateCommentReply } from '../lib/social-comment-reply';
import {
  likeComment,
  replyToFacebookComment,
  fetchFacebookPostMessage,
} from '../lib/instagram-automation';

const DRY_RUN = process.env.DRY_RUN !== 'false';

// The comment we found via Graph API
const COMMENT = {
  commentId: '122159518502814845_1892052381516652',
  postId: '648413995011142_122159518502814845',
  authorId: 'unknown', // from field was empty for this comment
  commentText: 'Partly. No its wholly to blame.',
};

async function main() {
  console.log('--- Social Comment Reply Test ---');
  console.log(`DRY_RUN: ${DRY_RUN} (set DRY_RUN=false to post for real)\n`);

  // 1. Fetch post caption for context
  console.log('1. Fetching post caption...');
  const caption = await fetchFacebookPostMessage(COMMENT.postId);
  console.log(`   Caption: ${caption?.slice(0, 100)}...\n`);

  // 2. Generate AI reply
  console.log('2. Generating AI reply...');
  const result = await generateCommentReply({
    commentText: COMMENT.commentText,
    postCaption: caption,
    platform: 'FACEBOOK',
  });

  console.log(`   Comment type: ${result.commentType}`);
  console.log(`   Fact-checked: ${result.factChecked}`);
  console.log(`   Skipped: ${result.skipped}`);
  if (result.skipReason) console.log(`   Skip reason: ${result.skipReason}`);
  console.log(`   Reply: ${result.reply}\n`);

  if (result.skipped || !result.reply) {
    console.log('AI decided to skip this comment. Done.');
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log('--- DRY RUN - not posting to Facebook ---');
    console.log(
      'To post for real, run: DRY_RUN=false npx tsx scripts/test-social-reply.ts',
    );
    process.exit(0);
  }

  // 3. Like the comment
  console.log('3. Liking comment...');
  const likeResult = await likeComment(COMMENT.commentId);
  console.log(`   Like: ${likeResult.success ? 'OK' : likeResult.error}\n`);

  // 4. Post the reply
  console.log('4. Posting reply...');
  const replyResult = await replyToFacebookComment(
    COMMENT.commentId,
    result.reply,
  );
  console.log(`   Reply: ${replyResult.success ? 'OK' : replyResult.error}\n`);

  console.log('Done!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
