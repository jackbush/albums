/** @type {import('../../lib/schema').AlbumManifest} */
export default {
  title: "Mount Agung",
  location: "Bali",
  year: "2017",
  cover: "./media/_JB18717.jpg",
  // _JB18685 the blue/pink one
  // _JB18717 red peak
  // _JB18735 crater rim wall

  items: [
    {
      type: "photos",
      caption: false,
      images: [
        {
          src: "./media/_JB18663.jpg",
          alt: "Town lights far below smeared by a long exposure, cloud lying across the slope",
        },
      ],
    },
    {
      type: "photos",
      caption: false,
      images: [
        {
          src: "./media/_JB18685.jpg",
          alt: "Violet and pink sky over a low cloud bank, lights of the plain showing underneath",
        },
      ],
    },
    {
      type: "photos",
      caption: false,
      images: [
        {
          src: "./media/_JB18717.jpg",
          alt: "A ridge falling steeply away, a distant peak standing out of the blue haze",
        },
      ],
    },
    {
      type: "photos",
      closer: true,
      caption: "Inside the crater. This one erupted in quite a big way about six months later, which on a geological timescale feels pretty close.",
      images: [
        {
          src: "./media/_JB18722.jpg",
          alt: "A guide in a white jacket and a head torch on his cap, the crater rim behind him",
        },
        {
          src: "./media/_JB18724.jpg",
          alt: "The summit ridge in the blue half-light, its gullies picked out in red",
        },
        {
          src: "./media/_JB18735.jpg",
          alt: "The inside of the crater in daylight, its walls streaked yellow, red and grey",
        },
      ],
    },
    {
      type: "photos",
      caption: "The way down, feat. gorgeous fern trees and finally a look at all I'd been stumbling over on the way up.",
      hero: true,
      images: [
        {
          src: "./media/_JB18741.jpg",
          alt: "Looking down the bare upper slope to green hills and cloud beyond",
        },
        {
          src: "./media/_JB18745.jpg",
          alt: "A muddy path cut deep into the forest floor, roots crossing it",
        },
        {
          src: "./media/_JB18751.jpg",
          alt: "Tree ferns spread across the understorey in low forest light",
        },
      ],
    },
  ],
};
