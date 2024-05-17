const Controller = require('../controllers/api.controlles.js')
const routers = [
    //FIXME: Admin
    {
        method: 'POST',
        path: '/api/create-admin',
        config: Controller.createAdmin,
    },
    {
        method: 'GET',
        path: '/api/get-all-admin',
        config: Controller.getAllAdmin
    },
    {
        method: 'POST',
        path: '/api/update-admin',
        config: Controller.updateAdmin
    },
    {
        method: 'POST',
        path: '/api/delete-admin',
        config: Controller.deleteAdmin
    },
    //FIXME: MasterData
    {
        method: 'POST',
        path: '/api/create-master-location',
        config: Controller.createMasterLocation
    },
    {
        method: 'GET',
        path: '/api/get-all-master-location',
        config: Controller.getAllMasterLocation
    },
    //FIXME: Event
    {
        method: 'POST',
        path: '/api/create-event',
        config: Controller.createEvent
    },
    {
        method: 'POST',
        path: '/api/upload-image-event',
        config : Controller.uploadImageEvent
        // options: {
        //     payload: {
        //         output: 'stream',
        //         parse: true,
        //         multipart: true
        //     }
        // },
        // ...Controller.uploadImageEvent
    },
    {
        method: 'GET',
        path: '/api/get-all-event',
        config: Controller.getAllEvent
    },
    {
        method : 'POST',
        path : '/api/test-encrypt',
        config : Controller.cryptTest
    }
]

module.exports = routers