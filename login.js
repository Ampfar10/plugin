const TruecallerJS = require('truecallerjs');

const installationId = 'a1k07--Vgdfyvv_rftf5uuudhuhnkljyvvtfftjuhbuijbhug'; // Replace with your valid installationId

const loginData = {
    installationId: installationId,
};

// Log in command to verify the installation ID
TruecallerJS.verifyInstallation(loginData)
    .then(response => {
        console.log('Logged in successfully:', response);
    })
    .catch(error => {
        console.error('Login failed:', error);
    });
