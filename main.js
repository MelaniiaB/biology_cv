function varsForSource(src) {
    return {
        DEBUG: true,
        ENLARGE_RECT_BY: 1.05,
        redLower: [new cv.Mat(src.rows, src.cols, src.type(), [0, 120, 70, 0]), new cv.Mat(src.rows, src.cols, src.type(), [175, 140, 100, 0])],
        redUpper: [new cv.Mat(src.rows, src.cols, src.type(), [10, 210, 255, 255]), new cv.Mat(src.rows, src.cols, src.type(), [180, 255, 180, 255])],
        redBorderLower: [new cv.Mat(src.rows, src.cols, src.type(), [0, 0, 0, 0]), new cv.Mat(src.rows, src.cols, src.type(), [170, 0, 0, 0])],
        redBorderUpper: [new cv.Mat(src.rows, src.cols, src.type(), [15, 255, 255, 255]), new cv.Mat(src.rows, src.cols, src.type(), [180, 255, 255, 255])],
        yellowBorderLower: [new cv.Mat(src.rows, src.cols, src.type(), [20, 0, 0, 0])],
        yellowBorderUpper: [new cv.Mat(src.rows, src.cols, src.type(), [30, 255, 255, 255])],
        greenBorderLower: [new cv.Mat(src.rows, src.cols, src.type(), [40, 0, 0, 0])],
        greenBorderUpper: [new cv.Mat(src.rows, src.cols, src.type(), [75, 255, 255, 255])],
        whiteRangeLower: [new cv.Mat(src.rows, src.cols, src.type(), [0, 0, 200, 0])],
        whiteRangeUpper: [new cv.Mat(src.rows, src.cols, src.type(), [180, 50, 255, 255])],
        darkblueRangeLower: [new cv.Mat(src.rows, src.cols, src.type(), [90, 100, 50, 0])],
        darkblueRangeUpper: [new cv.Mat(src.rows, src.cols, src.type(), [150, 255, 100, 255])],
        yellowRangeLower: [new cv.Mat(src.rows, src.cols, src.type(), [20, 100, 100, 0])],
        yellowRangeUpper: [new cv.Mat(src.rows, src.cols, src.type(), [30, 255, 255, 255])],
        orangeRangeLower: [new cv.Mat(src.rows, src.cols, src.type(), [6, 100, 180, 0])],
        orangeRangeUpper: [new cv.Mat(src.rows, src.cols, src.type(), [15, 255, 255, 255])],
        greenRangeLower: [new cv.Mat(src.rows, src.cols, src.type(), [40, 100, 0, 0])],
        greenRangeUpper: [new cv.Mat(src.rows, src.cols, src.type(), [75, 255, 255, 255])],
        purpleRangeLower: [new cv.Mat(src.rows, src.cols, src.type(), [110, 50, 100, 0])],
        purpleRangeUpper: [new cv.Mat(src.rows, src.cols, src.type(), [140, 255, 255, 255])]
    }
}

function applyColorMask(hsv, lowerRange, upperRange, bgMask = null) {

    let masks = null;
    for (let i = 0; i < lowerRange.length; i++) {
        let lower = lowerRange[i];
        let upper = upperRange[i];
        let mask = new cv.Mat();
        cv.inRange(hsv, lower, upper, mask);

        if (masks === null) {
            masks = mask;
        } else {
            cv.add(masks, mask, masks);
        }
    }

    let kernel = new cv.Mat.ones(2, 2, cv.CV_8U);
    cv.dilate(masks, masks, kernel, new cv.Point(-1, -1), 1);
    cv.erode(masks, masks, kernel, new cv.Point(-1, -1), 5);

    if (bgMask !== null) {
        cv.bitwise_and(masks, bgMask, masks);
    }

    return masks;
}

function filterEllipse(bgMask, hsvImg, drawImg, lowerRange, upperRange, nameIfCircle, nameIfEllipse = null, nameIfNonEllipse = null, minSize = 0.005, sizeOfNonEllipse = 0.005) {
    let found = [];

    let mask = applyColorMask(hsvImg, lowerRange, upperRange, bgMask);


    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(mask, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    // fill the contours with white

    cv.drawContours(mask, contours, -1, new cv.Scalar(255, 255, 255), cv.FILLED);

    cv.findContours(mask, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
        let bgArea = cv.countNonZero(bgMask);
        let percentArea = area / bgArea;

        if (percentArea > minSize) {
            let boundingRect = cv.boundingRect(contour);
            let ellipse = cv.fitEllipse(contour);

            let maskEllipse = new cv.Mat.zeros(mask.rows, mask.cols, cv.CV_8U);
            cv.ellipse1(maskEllipse, ellipse, new cv.Scalar(255, 255, 255), -1, cv.LINE_8);

            cv.imshow('canvasDebug', maskEllipse);

            let maskContour = new cv.Mat.zeros(mask.rows, mask.cols, cv.CV_8U);
            cv.drawContours(maskContour, contours, i, new cv.Scalar(255, 255, 255), cv.FILLED);

            let diff = new cv.Mat();
            cv.absdiff(maskContour, maskEllipse, diff);

            let nonEllipse = cv.countNonZero(diff) / area > 0.1;

            let figure;
            let yShift = 0;
            if (nonEllipse) {
                if (percentArea > sizeOfNonEllipse) {
                    cv.drawContours(drawImg, contours, i, new cv.Scalar(0, 255, 0), 1);
                    figure = nameIfNonEllipse || nameIfCircle;
                    yShift = - boundingRect.height / 4;
                }
            } else {
                cv.ellipse1(drawImg, ellipse, new cv.Scalar(0, 255, 0), 1);
                let ratio = ellipse.size.width / ellipse.size.height;
                figure = ratio > 0.6 ? nameIfCircle : (nameIfEllipse || nameIfCircle);
            }

            if (figure) {
                found.push(figure);
                cv.putText(drawImg, figure, new cv.Point(boundingRect.x + boundingRect.width / 2 - ellipse.size.width / 2, boundingRect.y + boundingRect.height / 2 + yShift), cv.FONT_HERSHEY_COMPLEX, 0.5, new cv.Scalar(0, 0, 255), 2);
            }

            maskEllipse.delete();
            maskContour.delete();
            diff.delete();
        }
        contour.delete();
    }

    contours.delete();
    hierarchy.delete();
    mask.delete();

    return [found, drawImg];
}

function calculateDistance(point1, point2) {
    let dx = point1.x - point2.x;
    let dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}


function filterBackground(origImg, drawImg) {

    let gray = new cv.Mat();
    cv.cvtColor(origImg, gray, cv.COLOR_BGR2GRAY);

    let blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 50, 150, 3, false);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let selected_contours = new cv.MatVector();

    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let peri = cv.arcLength(contour, false);

        let approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.02 * peri, false);
        if (approx.rows < 6) {  // Looking for at least 6 values, representing 3 points (x and y)
            continue;
        }

        if (approx.rows < 12) {  // at least 6 corners are needed
            continue;
        }

        // The `approx` represents the corners found in the contour
        let avg_dist = 0;
        for (let i = 3; i < approx.rows; i+=2) {
            let p1 = new cv.Point(approx.data32S[i], approx.data32S[i-1]);
            let p2 = new cv.Point(approx.data32S[i-2], approx.data32S[i-3]);
            avg_dist += calculateDistance(p1, p2);
        }
        avg_dist /= approx.rows / 2;
        // console.log("avg_dist", avg_dist,  0.1 * Math.max(origImg.rows, origImg.cols));

        if (avg_dist < 0.1 * Math.max(origImg.rows, origImg.cols)) {
            // it's not our background
            continue;
        }

        // calculate an average angle between each three points of the approximated contour
        let avg_angle = 0;
        for (let i = 5; i < approx.rows; i+=2) {
            let p1x = approx.data32S[i];
            let p1y = approx.data32S[i-1];
            let p2x = approx.data32S[i-2];
            let p2y = approx.data32S[i-3];
            let angle1 = Math.atan2(p1y - p2y, p1x - p2x);

            let p3x = approx.data32S[i-4];
            let p3y = approx.data32S[i-5];
            let angle2 = Math.atan2(p3y - p2y, p3x - p2x);
            avg_angle += Math.abs(angle2 - angle1);
        }
        avg_angle /= approx.rows / 2;

        if (((0.8 * Math.PI / 2 < avg_angle) && (avg_angle < 1.5 * Math.PI / 2))) {
            selected_contours.push_back(contour);
        }

        approx.delete();
        contour.delete();
    }

    // create convex hull of points of all contours in selected_contours
    let allPoints = [];
    for (let i = 0; i < selected_contours.size(); i++) {
        let contour = selected_contours.get(i);
        for (let j = 0; j < contour.data32S.length / 2; j++) {
            allPoints.push([contour.data32S[j * 2], contour.data32S[j * 2 + 1]]);
        }
    }
    let cont = cv.matFromArray(allPoints.length, 1, cv.CV_32SC2, allPoints.flat(2));

    if (cont.rows === 0) {
        return [0, 0, 0];
    }

    if (selected_contours.size() === 0) {
        return [0, 0, 0];
    }

    let hull = new cv.Mat();
    cv.convexHull(cont, hull, false, true);

    let outerMask = new cv.Mat.zeros(gray.rows, gray.cols, cv.CV_8U);
    let innerMask = new cv.Mat.zeros(gray.rows, gray.cols, cv.CV_8U);
    let regularMask = new cv.Mat.zeros(gray.rows, gray.cols, cv.CV_8U);

    let rect = cv.minAreaRect(hull);
    let box = cv.RotatedRect.points(rect);

    let enlargedRect = new cv.RotatedRect(rect.center, new cv.Size(rect.size.width * 1.05, rect.size.height * 1.05), rect.angle);
    let reducedRect = new cv.RotatedRect(rect.center, new cv.Size(rect.size.width / 1.05, rect.size.height / 1.05), rect.angle);

    let enlargedBox = cv.RotatedRect.points(enlargedRect);
    let reducedBox = cv.RotatedRect.points(reducedRect);

    let enlargedBoxMat = cv.matFromArray(4, 1, cv.CV_32SC2, enlargedBox.map(p => [p.x, p.y]).flat(2));
    let reducedBoxMat = cv.matFromArray(4, 1, cv.CV_32SC2, reducedBox.map(p => [p.x, p.y]).flat(2));
    let boxMat = cv.matFromArray(4, 1, cv.CV_32SC2, box.map(p => [p.x, p.y]).flat(2));

    for (let i = 0; i < 4; i++) {
        cv.line(drawImg, enlargedBox[i], enlargedBox[(i + 1) % 4], new cv.Scalar(0, 0, 255), 2, cv.LINE_AA, 0);
    }

    // make masks
    let enlargedBoxMat2 = new cv.MatVector();
    enlargedBoxMat2.push_back(enlargedBoxMat);
    // output points in console
    cv.fillPoly(outerMask, enlargedBoxMat2, new cv.Scalar(255, 255, 255));

    let reducedBoxMat2 = new cv.MatVector();
    reducedBoxMat2.push_back(reducedBoxMat);
    cv.fillPoly(innerMask, reducedBoxMat2, new cv.Scalar(255, 255, 255));

    let boxMat2 = new cv.MatVector();
    boxMat2.push_back(boxMat);
    cv.fillPoly(regularMask, boxMat2, new cv.Scalar(255, 255, 255));


    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
    cont.delete();
    hull.delete();
    enlargedBoxMat.delete();
    reducedBoxMat.delete();
    enlargedBoxMat2.delete();
    reducedBoxMat2.delete();
    boxMat.delete();
    boxMat2.delete();

    return [outerMask, innerMask, regularMask];
}

function getBorderType(bgMask, insideMask, hsv, drawImg, vars) {
    let borderMask = new cv.Mat();
    cv.subtract(bgMask, insideMask, borderMask);

    let red = applyColorMask(hsv, vars.redBorderLower, vars.redBorderUpper, borderMask);
    let redArea = cv.countNonZero(red);
    let green = applyColorMask(hsv, vars.greenBorderLower, vars.greenBorderUpper, borderMask);
    let greenArea = cv.countNonZero(green);
    let yellow = applyColorMask(hsv, vars.yellowBorderLower, vars.yellowBorderUpper, borderMask);
    let yellowArea = cv.countNonZero(yellow);

    let colors = {'Bacteria': redArea, 'Plant': greenArea, 'Fungi': yellowArea};
    let maxColorName = Object.keys(colors).reduce((a, b) => colors[a] > colors[b] ? a : b);

    if (colors[maxColorName] < 100) {
        maxColorName = 'Animal';
    }
    cv.putText(drawImg, maxColorName, new cv.Point(10, 50), cv.FONT_HERSHEY_COMPLEX, 1, new cv.Scalar(255, 255, 255), 3);
    cv.putText(drawImg, maxColorName, new cv.Point(10, 50), cv.FONT_HERSHEY_COMPLEX, 1, new cv.Scalar(0, 0, 255), 2);
    return maxColorName;
}

function lookup(img) {
    let drawImg = img.clone();
    let [bgMask, insideMask, regularMask] = filterBackground(img, drawImg);
    if (bgMask === 0) {
        return drawImg;
    }

    let hsv = new cv.Mat();
    cv.cvtColor(img, hsv, cv.COLOR_RGB2HSV);

    let vars = varsForSource(hsv);

    let [foundRed, redImg] = filterEllipse(bgMask, hsv, drawImg, vars.redLower, vars.redUpper, 'Nucleus', 'Mitochondria', 'Circular DNA');
    let [foundWhite, whiteImg] = filterEllipse(bgMask, hsv, redImg, vars.whiteRangeLower, vars.whiteRangeUpper, 'Lysosome', 'Vacuole');
    let [foundDarkBlue, darkBlueImg] = filterEllipse(bgMask, hsv, whiteImg, vars.darkblueRangeLower, vars.darkblueRangeUpper, 'Cell center');
    let [foundYellow, yellowImg] = filterEllipse(bgMask, hsv, darkBlueImg, vars.yellowRangeLower, vars.yellowRangeUpper, 'Golgi');
    let [foundOrange, orangeImg] = filterEllipse(bgMask, hsv, yellowImg, vars.orangeRangeLower, vars.orangeRangeUpper, 'ER'); // ендоплазматична сiтка
    let [foundGreen, greenImg] = filterEllipse(bgMask, hsv, orangeImg, vars.greenRangeLower, vars.greenRangeUpper, 'Chloroplast');
    let [foundPurple, purpleImg] = filterEllipse(bgMask, hsv, greenImg, vars.purpleRangeLower, vars.purpleRangeUpper, 'Ribosome');

    let borderType = getBorderType(bgMask, insideMask, hsv, purpleImg, vars)

    let found = [...foundRed, ...foundYellow, ...foundWhite, ...foundDarkBlue, ...foundOrange, ...foundGreen, ...foundPurple];
    // unique elements
    found = new Set(found);

    bgMask.delete();
    insideMask.delete();
    regularMask.delete();
    hsv.delete();

    return [drawImg, found, borderType];
}
