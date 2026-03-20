const axios = require('axios');

async function testCloudinary(url) {
  try {
    const res = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });
    console.log('Success! Status:', res.status);
    console.log('Headers:', res.headers);
  } catch (error) {
    console.error('Error fetching URL:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

testCloudinary('https://res.cloudinary.com/demo/image/upload/w_200,h_200/sample.pdf').then(() => testCloudinary('https://res.cloudinary.com/demo/image/upload/sample.pdf'));
