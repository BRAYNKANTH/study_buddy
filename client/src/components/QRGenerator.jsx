import { QRCodeSVG } from 'qrcode.react';

const QRGenerator = ({ value, size = 200, minimal = false }) => {
    if (minimal) {
        return (
            <div className="bg-white p-1 rounded">
                <QRCodeSVG value={value} size={size} level="H" includeMargin={false} />
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <QRCodeSVG value={value} size={size} level="H" />
            <p className="mt-4 text-sm text-gray-500 font-mono bg-gray-50 px-3 py-1 rounded">
                {value}
            </p>
        </div>
    );
};

export default QRGenerator;
