/**
 * Home page settings, and which albums appear on it.
 *
 * Everything the home page needs is here: its metadata, its share image, and the
 * album order. First in the list is first on the page. Comment a line out to hide
 * an album — its page still builds at its own URL, it just isn't linked from the index.
 *
 * @type {import('../lib/schema').HomeManifest}
 */
export default {
  /** Browser tab and share title for the home page. */
  title: 'Jack Bush | Albums',

  /** Short name for the masthead and the back link on every album page. */
  heading: 'Albums',

  /** Meta description. */
  description:
    "Just nice, old-fashioned photo albums. Because social media is trash, but it's nice to show your mum what you've been up to.",

  /** Share image for the home page — should be 1200×630 */
  cover: './home-cover.jpg',

  posts: [
    '2019-purbeck',
    '2011-tibet',
    '2011-bangkok',
  ],
};
