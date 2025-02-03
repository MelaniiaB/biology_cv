import numpy as np
import cv2

def run(img):
    out = img.copy()

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    grey1 = cv2.inRange(hsv, (120, 0, 120), (150, 30, 150))
    grey1 = cv2.GaussianBlur(grey1, (5, 5), 0)
    mask = np.zeros_like(grey1)
    debug(grey1)
    contours, _ = cv2.findContours(
        grey1, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    for c in contours:
        if cv2.contourArea(c) > 400:
        p = cv2.arcLength(c, False)
    approx = cv2.approxPolyDP(c, 0.012*p, False)
    if cv2.isContourConvex(approx):
        mask = cv2.drawContours(mask, [approx], -1, 255, -1)

    out = cv2.bitwise_and(out, out, mask=mask)
    output(out)
