/**
 * Which albums appear on the home page, and in what order.
 * First in the list is first on the page. Comment a line out to hide a album —
 * its page still builds at its own URL, it just isn't linked from the index.
 *
 * @type {import('../lib/schema').HomeManifest}
 */
export default {
  posts: [
    '2019-purbeck',
    '2011-tibet',
    '2011-bangkok',
  ],
};
