const multer = require('multer');
const path = require('path');
const fs = require('fs');
const util = require('util');

/**
fieldname: 'file',
originalname: '49342301.jpeg',
encoding: '7bit',
mimetype: 'image/jpeg',
destination: '/Users/asd/Desktop/vaultspay/banking-engine/public/uploads/',
filename: 'file-1656080147543.jpeg',
path: '/Users/asd/Desktop/vaultspay/banking-engine/public/uploads/file-1656080147543.jpeg',
size: 28336
*/

const multerUtils = {
	checkUndefined: () => {
		throw new Error('no arguments');
	},
	required: (options = {}) => {
		if (options.value === null || options.value === undefined || options.value === '')
			throw new Error(`Parameter ${options.name} is required`);
		else {
			return options.value;
		}
	},
	createDir: async (options = checkUndefined()) => {
		const exists = await util.promisify(fs.exists)(multerUtils.getUploadPath({ uploadDir: options.uploadDir }));
		if (!exists) {
			const path = multerUtils.getUploadPath({ uploadDir: options.uploadDir });
			const opts = { recursive: true, mode: 0o777 }; //default
			await util.promisify(fs.mkdir)(path, opts);
			return true;
		} else {
			return false;
		}
	},
	uploadMiddleware:
		(options = multerUtils.checkUndefined()) =>
		async (req, res, next) => {
			// Required Parameters Validation
			options.uploadDir = multerUtils.required({ value: options.uploadDir, name: 'uploadDir' });
			options.fieldName = multerUtils.required({ value: options.fieldName, name: 'fieldName' });
			// Default Parameters
			options.count = options.count ? options.count : 1;
			options.delete = options.delete ? options.delete : false;
			options.filetypes = /jpeg|jpg|png|gif/;
			options.createDir = options.createDir ? options.createDir : true;

			if (options.createDir) {
				await multerUtils.createDir({ uploadDir: options.uploadDir });
			}

			if (options.count === 1) {
				const upload = multerUtils.singleUpload(options);
				return upload(req, res, (err) => {
					if (err) {
						console.error('Error  : ', err);
						throw new Error(err);
					}
					if (req.file) {
						multerUtils.deleteFile({ path: req.file.path, delete: options.delete }, (err, isDeleted) => {
							req.file.serverPath = req.file.path.replace(process.cwd(), '');
							return next();
						});
					} else {
						throw new Error('req.file is undefined!');
					}
				});
			} else {
				const upload = multerUtils.arrayUpload(options);
				return upload(req, res, (err) => {
					if (err) {
						if (err instanceof multer.MulterError) {
							if (err.code === 'LIMIT_UNEXPECTED_FILE') {
								throw new Error(`${err.name} files upload limit mismatch provided expected ${req.files.length}!`);
							} else {
								throw new Error(`${err.code} & ${err.message}`);
							}
						} else if (err) {
							throw new Error(err);
						}
					}
					if (req.files) {
						if (req.files.length) {
							(async () => {
								await Promise.all(
									req.files.map(async (file) => {
										await util.promisify(multerUtils.deleteFile)({ path: file.path, delete: options.delete });
										file.serverPath = file.path.replace(process.cwd(), '');
										return file;
									})
								);
								return next();
							})();
						} else {
							throw new Error('No files to upload!');
						}
					} else {
						throw new Error('req.files is undefined!');
					}
				});
			}
		},
	checkFileType: (options = {}, cb) => {
		const extname = options.filetypes.test(path.extname(options.file.originalname).toLowerCase());
		const mimetype = options.filetypes.test(options.file.mimetype);
		if (mimetype && extname) {
			return cb(null, true);
		} else {
			cb('Invalid file extension', false);
		}
	},
	getUploadPath: (options = multerUtils.checkUndefined()) => {
		return path.join(process.cwd() + '/public/', options.uploadDir + '/');
	},

	deleteFile: (options = {}, cb) => {
		if (options.path) {
			return multerUtils.fileExists({ path: options.path }, (exists) => {
				if (exists) {
					if (options.delete) {
						return fs.unlink(options.path, (err) => {
							if (err) options.cb(err, false);
							return cb(null, true);
						});
					} else {
						return cb(null, false);
					}
				} else {
					return cb(null, false);
				}
			});
		} else {
		}
	},
	fileExists: (options = {}, cb) => {
		if (options.path) {
			return fs.exists(options.path, (exists) => {
				return cb(exists);
			});
		} else {
			return cb(false);
		}
	},

	singleUpload: (options = {}) => {
		return multer({
			// limits: {
			// fields: 5,
			//   fieldNameSize: 50, // TODO: Check if this size is enough
			//   fieldSize: 20000, //TODO: Check if this size is enough
			//   // TODO: Change this line after compression
			//   fileSize: 15000000, // 150 KB for a 1080x1080 JPG 90
			// },
			fileFilter: function (_req, file, cb) {
				return multerUtils.checkFileType({ file, filetypes: options.filetypes }, cb);
			},
			storage: multer.diskStorage({
				destination: async function (req, file, cb) {
					return cb(null, multerUtils.getUploadPath({ uploadDir: options.uploadDir }));
				},
				filename: function (req, file, cb) {
					return cb(null, file.fieldname + '-' + Date.now() + '.' + file.originalname.split('.').pop());
				},
			}),
		}).single(options.fieldName);
	},
	arrayUpload: (options = {}) => {
		return multer({
			// limits: {
			//   fields: 5,
			//   fieldNameSize: 50,
			//   fieldSize: 20000,
			//   fileSize: 15000000, // 150 KB
			// },
			fileFilter: function (_req, file, cb) {
				return multerUtils.checkFileType({ file, filetypes: options.filetypes }, cb);
			},
			storage: multer.diskStorage({
				destination: async function (req, file, cb) {
					return cb(null, multerUtils.getUploadPath({ uploadDir: options.uploadDir }));
				},
				filename: function (req, file, cb) {
					return cb(null, file.fieldname + '-' + Date.now() + '.' + file.originalname.split('.').pop());
				},
			}),
		}).array(options.fieldName, options.count);
	},
};

module.exports = multerUtils;
