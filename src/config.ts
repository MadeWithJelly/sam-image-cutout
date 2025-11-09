// Configuration for the application

export const config = {
  // REST API URL for SAM segmentation
  samApiUrl: 'http://localhost:5001',

  // Whether to use SAM API or fallback to local segmentation
  useSamApi: true,

  // Maximum number of segments for auto-segmentation
  maxSegments: 15,
};
