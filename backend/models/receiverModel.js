const db = require("../services/firebase");

const receiversCollection = db.collection("receivers");


async function createReceiver(receiverData) {

    const receiver = {
        name: receiverData.name,
        receiverType: receiverData.receiverType,
        location: receiverData.location,
        foodNeeded: receiverData.foodNeeded,
        quantityNeeded: receiverData.quantityNeeded,
        available: receiverData.available ?? true,
        createdAt: new Date()
    };

    const document = await receiversCollection.add(receiver);

    return {
        id: document.id,
        ...receiver
    };
}


async function getReceivers() {

    const snapshot = await receiversCollection.get();

    const receivers = [];

    snapshot.forEach((doc) => {

        receivers.push({
            id: doc.id,
            ...doc.data()
        });

    });

    return receivers;
}


module.exports = {
    createReceiver,
    getReceivers
};