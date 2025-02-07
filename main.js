// Створює змінні для обробки зображення
function varsForSource(src) {
    return {
        DEBUG: true,
        ENLARGE_RECT_BY: 1.05,
        // Діапазони кольорів для розпізнавання органел
        redLower: [new cv.Mat(src.rows, src.cols, src.type(), [0, 120, 70, 0]), new cv.Mat(src.rows, src.cols, src.type(), [175, 140, 100, 0])],
        redUpper: [new cv.Mat(src.rows, src.cols, src.type(), [10, 210, 255, 255]), new cv.Mat(src.rows, src.cols, src.type(), [180, 255, 180, 255])],
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
        purpleRangeUpper: [new cv.Mat(src.rows, src.cols, src.type(), [140, 255, 255, 255])],
        // Діапазони для розпізнавання меж клітин
        redBorderLower: [new cv.Mat(src.rows, src.cols, src.type(), [0, 0, 0, 0]), new cv.Mat(src.rows, src.cols, src.type(), [170, 0, 0, 0])],
        redBorderUpper: [new cv.Mat(src.rows, src.cols, src.type(), [15, 255, 255, 255]), new cv.Mat(src.rows, src.cols, src.type(), [180, 255, 255, 255])],
        yellowBorderLower: [new cv.Mat(src.rows, src.cols, src.type(), [20, 0, 0, 0])],
        yellowBorderUpper: [new cv.Mat(src.rows, src.cols, src.type(), [30, 255, 255, 255])],
        greenBorderLower: [new cv.Mat(src.rows, src.cols, src.type(), [40, 0, 0, 0])],
        greenBorderUpper: [new cv.Mat(src.rows, src.cols, src.type(), [75, 255, 255, 255])]
    }
}

// Застосовує маску кольору до зображення
function applyColorMask(hsv, lowerRange, upperRange, bgMask = null) {
    let masks = null;
    for (let i = 0; i < lowerRange.length; i++) {
        let mask = new cv.Mat();
        cv.inRange(hsv, lowerRange[i], upperRange[i], mask);
        
        if (masks === null) {
            masks = mask;
        } else {
            cv.add(masks, mask, masks);
            mask.delete();
        }
    }

    let kernel = new cv.Mat.ones(2, 2, cv.CV_8U);
    cv.dilate(masks, masks, kernel, new cv.Point(-1, -1), 1);
    cv.erode(masks, masks, kernel, new cv.Point(-1, -1), 5);
    kernel.delete();

    if (bgMask !== null) {
        cv.bitwise_and(masks, bgMask, masks);
    }

    return masks;
}

// Фільтрує та розпізнає еліптичні форми на зображенні
function filterEllipse(bgMask, hsvImg, drawImg, lowerRange, upperRange, nameIfCircle, nameIfEllipse = null, nameIfNonEllipse = null, minSize = 0.005, sizeOfNonEllipse = 0.005) {
    let found = [];

    // Отримуємо маску для потрібного діапазону кольорів
    let mask = applyColorMask(hsvImg, lowerRange, upperRange, bgMask);

    // Знаходимо та заповнюємо контури
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(mask, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    cv.drawContours(mask, contours, -1, new cv.Scalar(255, 255, 255), cv.FILLED);
    cv.findContours(mask, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    // Обробляємо кожен контур
    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
        let percentArea = area / cv.countNonZero(bgMask);

        // Пропускаємо, якщо контур замалий
        if (percentArea <= minSize) {
            contour.delete();
            continue;
        }

        // Аналізуємо форму
        let boundingRect = cv.boundingRect(contour);
        let ellipse = cv.fitEllipse(contour);

        // Порівнюємо контур з намальованим еліпсом
        let maskEllipse = new cv.Mat.zeros(mask.rows, mask.cols, cv.CV_8U);
        let maskContour = new cv.Mat.zeros(mask.rows, mask.cols, cv.CV_8U);
        let diff = new cv.Mat();

        cv.ellipse1(maskEllipse, ellipse, new cv.Scalar(255, 255, 255), -1, cv.LINE_8);
        cv.drawContours(maskContour, contours, i, new cv.Scalar(255, 255, 255), cv.FILLED);
        cv.absdiff(maskContour, maskEllipse, diff);

        // Визначаємо, еліпс чи ні
        let isNonElliptical = cv.countNonZero(diff) / area > 0.1;
        let figure;
        let yShift = 0;

        if (isNonElliptical && percentArea > sizeOfNonEllipse) {
            cv.drawContours(drawImg, contours, i, new cv.Scalar(255, 255, 255), 1);
            figure = nameIfNonEllipse || nameIfCircle;
            yShift = -boundingRect.height / 4;
        } else if (!isNonElliptical) {
            cv.ellipse1(drawImg, ellipse, new cv.Scalar(255, 255, 255), 1);
            let ratio = ellipse.size.width / ellipse.size.height;
            figure = ratio > 0.6 ? nameIfCircle : (nameIfEllipse || nameIfCircle);
        }

        // Додаємо підпис, якщо фігуру ідентифіковано
        if (figure) {
            found.push(figure);
            let textPoint = new cv.Point(
                boundingRect.x + boundingRect.width / 2 - ellipse.size.width / 2,
                boundingRect.y + boundingRect.height / 2 + yShift
            );
            cv.putText(drawImg, figure, textPoint, cv.FONT_HERSHEY_COMPLEX, 0.5, new cv.Scalar(255, 255, 255), 2);
        }

        // Очищення пам'яті
        cleanupMats([maskEllipse, maskContour, diff, contour]);
    }

    // Фінальне очищення пам'яті
    cleanupMats([contours, hierarchy, mask]);

    return [found, drawImg];
}

// Обчислює відстань між двома точками
function calculateDistance(point1, point2) {
    let dx = point1.x - point2.x;
    let dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Фільтрує фон зображення
function filterBackground(origImg, drawImg) {
    // Конвертуємо у відтінки сірого та застосовуємо розмиття
    let gray = new cv.Mat();
    let blurred = new cv.Mat();
    cv.cvtColor(origImg, gray, cv.COLOR_BGR2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // Знаходимо краї та контури
    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 50, 150, 3, false);
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // Фільтруємо та обираємо валідні контури
    let selected_contours = new cv.MatVector();
    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let peri = cv.arcLength(contour, false);
        let approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.02 * peri, false);

        // Пропускаємо, якщо недостатньо точок
        if (approx.rows < 12) {
            cleanupMats([approx, contour]);
            continue;
        }

        // Обчислюємо середню відстань між точками
        let avg_dist = calculateAverageDistance(approx);
        if (avg_dist < 0.1 * Math.max(origImg.rows, origImg.cols)) {
            cleanupMats([approx, contour]);
            continue;
        }

        // Обчислюємо середній кут між точками
        let avg_angle = calculateAverageAngle(approx);
        
        if ((0.8 * Math.PI / 2 < avg_angle) && (avg_angle < 1.5 * Math.PI / 2)) {
            selected_contours.push_back(contour);
        }

        cleanupMats([approx, contour]);
    }

    // Обробляємо випадок відсутності валідних контурів
    if (selected_contours.size() === 0) {
        cleanupMats([gray, blurred, edges, contours, hierarchy, selected_contours]);
        return [0, 0, 0];
    }

    // Створюємо опуклу оболонку з усіх точок
    let allPoints = extractPoints(selected_contours);
    let cont = cv.matFromArray(allPoints.length, 1, cv.CV_32SC2, allPoints.flat(2));
    let hull = new cv.Mat();
    cv.convexHull(cont, hull, false, true);

    // Створюємо маски
    let [outerMask, innerMask] = createMasks(hull, gray.rows, gray.cols);
    drawBoundingBox(drawImg, hull);

    // Очищення пам'яті
    cleanupMats([gray, blurred, edges, contours, hierarchy, cont, hull, selected_contours]);

    return [outerMask, innerMask];
}

// Обчислює середню відстань між точками контуру
function calculateAverageDistance(approx) {
    let avg_dist = 0;
    for (let i = 3; i < approx.rows; i+=2) {
        let p1 = new cv.Point(approx.data32S[i], approx.data32S[i-1]);
        let p2 = new cv.Point(approx.data32S[i-2], approx.data32S[i-3]);
        avg_dist += calculateDistance(p1, p2);
    }
    return avg_dist / (approx.rows / 2);
}

// Обчислює середній кут між точками контуру
function calculateAverageAngle(approx) {
    let avg_angle = 0;
    for (let i = 5; i < approx.rows; i+=2) {
        let p1x = approx.data32S[i];
        let p1y = approx.data32S[i-1];
        let p2x = approx.data32S[i-2];
        let p2y = approx.data32S[i-3];
        let p3x = approx.data32S[i-4];
        let p3y = approx.data32S[i-5];

        let angle1 = Math.atan2(p1y - p2y, p1x - p2x);
        let angle2 = Math.atan2(p3y - p2y, p3x - p2x);
        avg_angle += Math.abs(angle2 - angle1);
    }
    return avg_angle / (approx.rows / 2);
}

// Витягує точки з контурів
function extractPoints(contours) {
    let points = [];
    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        for (let j = 0; j < contour.data32S.length / 2; j++) {
            points.push([contour.data32S[j * 2], contour.data32S[j * 2 + 1]]);
        }
    }
    return points;
}

// Створює внутрішню та зовнішню маски з опуклої оболонки
function createMasks(hull, rows, cols) {
    let rect = cv.minAreaRect(hull);
    let enlargedRect = new cv.RotatedRect(
        rect.center,
        new cv.Size(rect.size.width * 1.05, rect.size.height * 1.05),
        rect.angle
    );
    let reducedRect = new cv.RotatedRect(
        rect.center,
        new cv.Size(rect.size.width / 1.05, rect.size.height / 1.05),
        rect.angle
    );

    // Створюємо порожні маски
    let outerMask = new cv.Mat.zeros(rows, cols, cv.CV_8U);
    let innerMask = new cv.Mat.zeros(rows, cols, cv.CV_8U);

    // Отримуємо точки прямокутників
    let enlargedBox = cv.RotatedRect.points(enlargedRect);
    let reducedBox = cv.RotatedRect.points(reducedRect);

    // Конвертуємо точки у формат для OpenCV
    let enlargedBoxMat = cv.matFromArray(4, 1, cv.CV_32SC2, enlargedBox.map(p => [p.x, p.y]).flat(2));
    let reducedBoxMat = cv.matFromArray(4, 1, cv.CV_32SC2, reducedBox.map(p => [p.x, p.y]).flat(2));

    // Створюємо вектори матриць
    let enlargedBoxMat2 = new cv.MatVector();
    let reducedBoxMat2 = new cv.MatVector();
    enlargedBoxMat2.push_back(enlargedBoxMat);
    reducedBoxMat2.push_back(reducedBoxMat);

    // Заповнюємо маски
    cv.fillPoly(outerMask, enlargedBoxMat2, new cv.Scalar(255, 255, 255));
    cv.fillPoly(innerMask, reducedBoxMat2, new cv.Scalar(255, 255, 255));

    // Очищення пам'яті
    cleanupMats([enlargedBoxMat, reducedBoxMat, enlargedBoxMat2, reducedBoxMat2]);

    return [outerMask, innerMask];
}

// Малює обмежувальну рамку навколо клітини
function drawBoundingBox(drawImg, hull) {
    let rect = cv.minAreaRect(hull);
    let enlargedRect = new cv.RotatedRect(
        rect.center,
        new cv.Size(rect.size.width * 1.05, rect.size.height * 1.05),
        rect.angle
    );
    let box = cv.RotatedRect.points(enlargedRect);
    
    // Малюємо лінії рамки
    for (let i = 0; i < 4; i++) {
        cv.line(drawImg, box[i], box[(i + 1) % 4],
            new cv.Scalar(255, 255, 255),
            2, cv.LINE_AA, 0);
    }
}

// Очищує пам'ять матриць OpenCV
function cleanupMats(mats) {
    mats.forEach(mat => mat.delete());
}

// Визначає тип клітини за кольором її межі
function getBorderType(bgMask, insideMask, hsv, drawImg, vars) {
    let borderMask = new cv.Mat();
    cv.subtract(bgMask, insideMask, borderMask);

    // Підраховуємо кількість пікселів кожного кольору на межі
    let colors = {
        'Bacteria': cv.countNonZero(applyColorMask(hsv, vars.redBorderLower, vars.redBorderUpper, borderMask)),
        'Plant': cv.countNonZero(applyColorMask(hsv, vars.greenBorderLower, vars.greenBorderUpper, borderMask)),
        'Fungi': cv.countNonZero(applyColorMask(hsv, vars.yellowBorderLower, vars.yellowBorderUpper, borderMask))
    };

    // Визначаємо домінуючий колір
    let maxColorName = Object.keys(colors).reduce((a, b) => colors[a] > colors[b] ? a : b);
    maxColorName = colors[maxColorName] < 100 ? 'Animal' : maxColorName;

    // Якщо кількість пікселів замала, вважаємо клітину тваринною
    if (colors[maxColorName] < 100) {
        maxColorName = 'Animal';
    }

    // Додаємо підпис з типом клітини
    cv.putText(drawImg, maxColorName, new cv.Point(10, 50), cv.FONT_HERSHEY_COMPLEX, 1, new cv.Scalar(255, 255, 255), 3);
    cv.putText(drawImg, maxColorName, new cv.Point(10, 50), cv.FONT_HERSHEY_COMPLEX, 1, new cv.Scalar(255, 255, 255), 2);
    return maxColorName;
}

// Перелік органел, які очікуються у кожному типі клітини
const organellesForCellType = {
    'Animal':       ['Nucleus', 'Mitochondria', 'Golgi', 'ER', 'Ribosome'],
    'Plant':        ['Nucleus', 'Golgi', 'ER', 'Lysosome', 'Chloroplast'],
    'Bacteria':     ['Circular DNA', 'Ribosome'],
    'Fungi':        ['Nucleus', 'Mitochondria', 'Golgi', 'ER', 'Ribosome', 'Vacuole']
};

// Перевіряє, чи клітина містить всі "обов'язкові" органели для свого типу
function isValidCellComposition(borderType, foundOrganelles) {
    // Якщо тип клітини невідомий або не має вимог
    if (!organellesForCellType[borderType]) {
        return false;
    }

    // Перевіряємо, чи всі потрібні органели входять у набір знайдених
    return organellesForCellType[borderType].every(
        (orgName) => foundOrganelles.has(orgName)
    );
}

// Малює зелену галочку або червоний хрест залежно від результату
function drawValidationMark(drawImg, isValid) {
    // Товщина ліній та координати у верхньому правому куті
    let thickness = 10;
    let cx = drawImg.cols - 80; // Зміщення від правого краю
    let cy = 80; // Зміщення від верхнього краю
    let size = 30; // Розмір позначки

    if (isValid) {
        // Якщо усі необхідні органели знайдені, малюємо зелену галочку
        let green = new cv.Scalar(0, 255, 0);
        let black = new cv.Scalar(0, 0, 0);

        // Чорна обводка галочки
        cv.line(drawImg, new cv.Point(cx - size, cy), new cv.Point(cx - size/2, cy + size/2), black, thickness + 4);
        cv.line(drawImg, new cv.Point(cx - size/2, cy + size/2), new cv.Point(cx + size, cy - size), black, thickness + 4);

        // Зелена галочка
        cv.line(drawImg, new cv.Point(cx - size, cy), new cv.Point(cx - size/2, cy + size/2), green, thickness);
        cv.line(drawImg, new cv.Point(cx - size/2, cy + size/2), new cv.Point(cx + size, cy - size), green, thickness);
    } else {
        // Якщо не всі органели знайдені, малюємо червоний хрест
        let red = new cv.Scalar(0, 0, 255);
        let black = new cv.Scalar(0, 0, 0);

        // Чорна обводка хреста
        cv.line(drawImg, new cv.Point(cx - size, cy - size), new cv.Point(cx + size, cy + size), black, thickness + 4);
        cv.line(drawImg, new cv.Point(cx - size, cy + size), new cv.Point(cx + size, cy - size), black, thickness + 4);

        // Червоний хрест
        cv.line(drawImg, new cv.Point(cx - size, cy - size), new cv.Point(cx + size, cy + size), red, thickness);
        cv.line(drawImg, new cv.Point(cx - size, cy + size), new cv.Point(cx + size, cy - size), red, thickness);
    }
}

// Головна функція розпізнавання зображення
function lookup(img) {
    let drawImg = img.clone();
    // Конвертуємо зображення у BGR колірний простір перед обробкою
    cv.cvtColor(drawImg, drawImg, cv.COLOR_RGB2BGR);
    
    let [bgMask, insideMask] = filterBackground(img, drawImg);

    // Перевіряємо чи знайдено контур клітини
    if (bgMask === 0) {
        cv.cvtColor(drawImg, drawImg, cv.COLOR_BGR2RGB); // Конвертуємо назад у RGB
        return [drawImg, new Set(), -1];
    }

    // Конвертуємо у HSV колірний простір для кращого розпізнавання кольорів
    let hsv = new cv.Mat();
    cv.cvtColor(img, hsv, cv.COLOR_RGB2HSV);

    let vars = varsForSource(hsv);

    // Шукаємо різні органели за їх кольором та формою
    let [foundRed, redImg] = filterEllipse(bgMask, hsv, drawImg, vars.redLower, vars.redUpper, 'Nucleus', 'Mitochondria', 'Circular DNA');
    let [foundWhite, whiteImg] = filterEllipse(bgMask, hsv, redImg, vars.whiteRangeLower, vars.whiteRangeUpper, 'Lysosome', 'Vacuole');
    let [foundDarkBlue, darkBlueImg] = filterEllipse(bgMask, hsv, whiteImg, vars.darkblueRangeLower, vars.darkblueRangeUpper, 'Cell center');
    let [foundYellow, yellowImg] = filterEllipse(bgMask, hsv, darkBlueImg, vars.yellowRangeLower, vars.yellowRangeUpper, 'Golgi');
    let [foundOrange, orangeImg] = filterEllipse(bgMask, hsv, yellowImg, vars.orangeRangeLower, vars.orangeRangeUpper, 'ER');
    let [foundGreen, greenImg] = filterEllipse(bgMask, hsv, orangeImg, vars.greenRangeLower, vars.greenRangeUpper, 'Chloroplast');
    let [foundPurple, purpleImg] = filterEllipse(bgMask, hsv, greenImg, vars.purpleRangeLower, vars.purpleRangeUpper, 'Ribosome');

    // Визначаємо тип клітини за кольором межі
    let borderType = getBorderType(bgMask, insideMask, hsv, purpleImg, vars)

    // Збираємо всі знайдені органели
    let found = [...foundRed, ...foundYellow, ...foundWhite, ...foundDarkBlue, ...foundOrange, ...foundGreen, ...foundPurple];
    // Видаляємо дублікати
    found = new Set(found);

    // Перевіряємо коректність клітини
    const isValid = isValidCellComposition(borderType, found);
    // Малюємо відповідну позначку
    drawValidationMark(drawImg, isValid);

    // Очищення пам'яті
    cleanupMats([bgMask, insideMask, hsv]);

    // Конвертуємо назад у RGB для відображення
    cv.cvtColor(drawImg, drawImg, cv.COLOR_BGR2RGB);
    return [drawImg, found, borderType];
}
