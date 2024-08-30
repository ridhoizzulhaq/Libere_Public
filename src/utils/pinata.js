import PinataSDK from '@pinata/sdk';

const pinata = PinataSDK(
  process.env.REACT_APP_PINATA_API_KEY,
  process.env.REACT_APP_PINATA_SECRET_API_KEY
);

export default pinata;
