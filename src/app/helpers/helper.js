const { env, Stream } = require("@burency/common");
const mongoose = require("mongoose");

class Helper {

	async autoUpload(url) {
		try {
			var uploadId = mongoose.Types.ObjectId();
			const options = {
				url,
				uploadId
			}
			const streamServer = new Stream({
				clientId: env("KAFKA_CLIENT_ID"),
				brokers: [env("KAFKA_BROKERS")],
			});
			  const ackStreamServer = await streamServer.produce(
				options,
				{
				  topic: 'BE.UPLOAD_FILE',
				  acks: 1,
				});
			return options.uploadId;
		} catch(error) {
			console.log("eeeeeeeeeeeeee", error)
		}
	}
}

module.exports = new Helper();
