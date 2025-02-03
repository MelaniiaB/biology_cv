import cv2


def run(img):
    out = img.copy()

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    red1 = cv2.inRange(hsv, (0, 180, 100), (10, 200, 180))
    red2 = cv2.inRange(hsv, (170, 140, 100), (180, 255, 180))

    red = cv2.bitwise_or(red1, red2)

    for i in range(10):
        red = cv2.erode(red, (5, 5))
    for i in range(10):
        red = cv2.dilate(red, (5, 5))


    contours, _ = cv2.findContours(
        red, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    fish = 0
    for c in contours:
        if cv2.contourArea(c) > 50:
            out = cv2.drawContours(out, [c], -1, (255, 0, 0), 3)
            fish = fish + 1
            ellipse = cv2.fitEllipse(c)
            proportions = max(ellipse[1])/min(ellipse[1])
            if proportions < 1.5:
                print("ядро")
                #out = cv2.putText(out, "kernel", (int(ellipse[0][0]), int(ellipse[0][1])), 1, 255, 1)
            else:
                print("мітохондрія")

    yellow1 = cv2.inRange(hsv, (20, 100, 100), (30, 255, 255))

    debug(yellow1)

    output(out)
