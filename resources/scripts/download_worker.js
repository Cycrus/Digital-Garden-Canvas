self.onmessage = (event) => {
    const { image_data, size } = event.data;
    if(image_data == undefined && size == undefined)
        return;

    const hex_to_rgba = (hexStr) => [
        parseInt(hexStr.substr(1, 2), 16),
        parseInt(hexStr.substr(3, 2), 16),
        parseInt(hexStr.substr(5, 2), 16),
        255
    ];

    const flattened_rgba_values = new Uint8ClampedArray(size.x * size.y * 4);

    let i = 0;
    for (let row = 0; row < size.y; row++) {
        for (let col = 0; col < size.x; col++) {
            const rgba = hex_to_rgba(image_data[row][col]);
            flattened_rgba_values[i++] = rgba[0];
            flattened_rgba_values[i++] = rgba[1];
            flattened_rgba_values[i++] = rgba[2];
            flattened_rgba_values[i++] = rgba[3];
        }
    }

    const canvas = new OffscreenCanvas(size.x, size.y);
    const ctx = canvas.getContext('2d');
    const export_image_data = new ImageData(flattened_rgba_values, size.x, size.y);
    ctx.putImageData(export_image_data, 0, 0);

    canvas.convertToBlob({ type: 'image/png' }).then((blob) => {
        const reader = new FileReader();
        reader.onload = () => {
            self.postMessage(reader.result);
        };
        reader.readAsDataURL(blob);
    });
};
