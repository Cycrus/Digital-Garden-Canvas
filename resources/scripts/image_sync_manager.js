/**
 * The class responsible for polling image data from the server and sending events to sync
 * the remote image with the local image and vice versa.
 */

class ImageSyncManager {
    constructor(size_data_ref, update_fun) {
	const url = new URL(window.location.href);
	this.server_url = `${url.origin}${url.pathname.replace(/\/$/, '')}`;

        this.size = size_data_ref;
        this.update_fun = update_fun;

        this.event_list = [];
    }

    /**
     * Sends a pixel event to the server to update the remote main version of the image.
     * @param {PixelEvent} event The pixel event to send to the server.
     */
    send_pixel_event(event) {
        this.event_list.push(event);

        fetch(this.server_url + "/queue_event", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
        })
        .catch(error => {
            console.error("Error queueing event:", error);
        });
    }

    /**
     * Polls the full image from the server and assigns the local image with the polled one.
     */
    poll_full_image() {
        fetch(this.server_url + "/poll_full_image")
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                this.update_fun(data);
                this.event_list = [];
            })
            .catch(error => {
                console.error("Not able to poll full image.", error);
            });
    }
}
