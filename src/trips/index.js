/**
 * Which trips appear on the home page, and in what order.
 * First in the list is first on the page. Comment a line out to hide a trip —
 * its page still builds at its own URL, it just isn't linked from the index.
 *
 * @type {import('../lib/schema').HomeManifest}
 */
export default {
  posts: [
    '2019-purbeck',
    // 'japan-2023',
  ],
};
