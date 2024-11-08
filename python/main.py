# opencv read image
import os

import cv2
import numpy as np

DEBUG = False

ENLARGE_RECT_BY = 1.05

red_lower = [np.array([0, 120, 70]), np.array([175, 140, 100])]
red_upper = [np.array([10, 210, 255]), np.array([180, 255, 180])]
red_border_lower = [np.array([0, 0, 0]), np.array([170, 0, 0])]
red_border_upper = [np.array([15, 255, 255]), np.array([180, 255, 255])]
yellow_border_lower = [np.array([20, 0, 0])]
yellow_border_upper = [np.array([30, 255, 255])]
green_border_lower = [np.array([40, 0, 0])]
green_border_upper = [np.array([75, 255, 255])]
white_range_lower = [np.array([0, 0, 200])]
white_range_upper = [np.array([180, 50, 255])]
darkblue_range_lower = [np.array([90, 100, 50])]
darkblue_range_upper = [np.array([150, 255, 100])]
yellow_range_lower = [np.array([20, 100, 100])]
yellow_range_upper = [np.array([30, 255, 255])]
orange_range_lower = [np.array([6, 100, 180])]
orange_range_upper = [np.array([15, 255, 255])]
green_range_lower = [np.array([40, 100, 0])]
green_range_upper = [np.array([75, 255, 255])]
purple_range_lower = [np.array([110, 50, 100])]
purple_range_upper = [np.array([140, 255, 255])]


def read_image(path):
    img = cv2.imread(path, -1)
    return img


def filter_ellipse(
        bg_mask,
        orig_img,
        draw_img,
        lower_ranges,
        upper_ranges,
        name_if_circle,
        name_if_ellipse=None,
        name_if_non_ellipse=None,
        min_size=0.005,
        size_of_non_ellipse=0.005
):
    found = []
    mask = apply_color_mask(orig_img, lower_ranges, upper_ranges, bg_mask=bg_mask)

    # Find contours in the masked image
    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    # fill the contours with white
    for contour in contours:
        cv2.drawContours(mask, [contour], -1, 255, cv2.FILLED)

    # Find contours in the masked image
    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    for pic, contour in enumerate(contours):
        area = cv2.contourArea(contour)
        # count of ones in bg_mask
        bg_area = np.count_nonzero(bg_mask)
        percent_area = area / bg_area
        if percent_area > min_size:
            x, y, w, h = cv2.boundingRect(contour)

            # find ellipse dimensions (even if rotated inside the rectangle)
            ellipse = cv2.fitEllipse(contour)

            # make a mask for the fitted ellipse
            mask_ellipse = np.zeros_like(mask)
            mask_ellipse = cv2.ellipse(mask_ellipse, ellipse, 255, -1)

            # draw contour on the mask
            mask_contour = np.zeros_like(mask)
            mask_contour = cv2.drawContours(mask_contour, [contour], -1, 255, cv2.FILLED)

            diff = mask_contour - mask_ellipse
            kernel = np.ones((2, 2), np.uint8)
            diff = cv2.erode(diff, kernel, iterations=1)

            # calculate the percentage of the area that is outside the ellipse but inside the contour
            perc = np.count_nonzero(diff) / area
            non_ellipse = perc > 0.1

            # plot it on the image
            if non_ellipse:
                if percent_area > size_of_non_ellipse:
                    draw_img = cv2.drawContours(draw_img, [contour], -1, (0, 255, 0), 1)
                    figure = name_if_non_ellipse or name_if_circle
                else:
                    continue
            else:
                draw_img = cv2.ellipse(draw_img, ellipse, (0, 255, 0), 1)
                # ratio of width to height
                ratio = ellipse[1][0] / ellipse[1][1]
                # draw the ratio
                if ratio > 0.6:
                    figure = name_if_circle
                else:
                    figure = name_if_ellipse or name_if_circle
            found.append(figure)
            cv2.putText(draw_img, f'{figure}', (int(x + w/2), int(y + h/2)), cv2.FONT_HERSHEY_COMPLEX, 0.5, (255, 255, 255), 5)
            cv2.putText(draw_img, f'{figure}', (int(x + w/2), int(y + h/2)), cv2.FONT_HERSHEY_COMPLEX, 0.5, (0, 0, 255), 2)

    return found, draw_img


def filter_random_figure(bg_mask, orig_img, draw_img, lower_ranges, upper_ranges, name, min_size=0.005):
    found = []
    mask = apply_color_mask(orig_img, lower_ranges, upper_ranges, bg_mask=bg_mask)

    # Find contours in the masked image
    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    # fill the contours with white
    for contour in contours:
        cv2.drawContours(mask, [contour], -1, 255, cv2.FILLED)

    if DEBUG:
        cv2.imshow('mask', mask)
        cv2.waitKey(0)

    # Find contours in the masked image
    contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    # Draw the contours on the original image
    for pic, contour in enumerate(contours):
        area = cv2.contourArea(contour)
        # count of ones in bg_mask
        bg_area = np.count_nonzero(bg_mask)
        percent_area = area / bg_area
        if percent_area > min_size:
            x, y, w, h = cv2.boundingRect(contour)

            # # find ellipse dimensions (even if rotated inside the rectangle)
            ellipse = cv2.fitEllipse(contour)
            draw_img = cv2.ellipse(draw_img, ellipse, (0, 255, 0), 1)

            found.append(name)
            cv2.putText(draw_img, f'{name}', (int(x + w/4), int(y + h/4)), cv2.FONT_HERSHEY_COMPLEX, 0.5, (255, 255, 255), 5)
            cv2.putText(draw_img, f'{name}', (int(x + w/4), int(y + h/4)), cv2.FONT_HERSHEY_COMPLEX, 0.5, (0, 0, 255), 2)

    return found, draw_img


def filter_background(orig_img, draw_img):
    gray = cv2.cvtColor(orig_img, cv2.COLOR_BGR2GRAY)
    # Apply Gaussian blur to reduce noise and improve edge detection
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    edges = cv2.Canny(blurred, 50, 150, apertureSize=3)

    # Find contours
    contours, _ = cv2.findContours(edges.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    selected_contours = []
    # Loop over the contours
    for contour in contours:
        # Approximate the contour
        peri = cv2.arcLength(contour, False)

        approx = cv2.approxPolyDP(contour, 0.02 * peri, False)
        if len(approx) < 2:
            continue

        # calculate an average angle between each three points of the approximated contour
        avg_angle = np.mean([np.abs(np.arctan2(approx[i][0][1]-approx[i-1][0][1], approx[i][0][0]-approx[i-1][0][0]) - np.arctan2(approx[i-1][0][1]-approx[i-2][0][1], approx[i-1][0][0]-approx[i-2][0][0])) for i in range(len(approx))])

        # The `approx` represents the corners found in the contour
        if len(approx) >= 6:  # Looking for at least 6 corners
            # average distance between the points of the approximated contour
            avg_dist = np.mean([np.linalg.norm(approx[i][0] - approx[i-1][0]) for i in range(len(approx))])
            # if the avg distance is relatively large, it's our background
            # let's compare it to the size of the image
            if (avg_dist > 0.1 * np.mean(orig_img.shape[:2])) and (0.8 * np.pi / 2 < avg_angle < 1.5 * np.pi / 2):
                # draw the contour on the image
                # print(avg_dist)
                # cv2.drawContours(image, [contour], -1, (0, 0, 255), 2)

                selected_contours.append(contour)

    # create an array of points of all contours in selected_contours
    points = np.concatenate(selected_contours)

    # make hull
    hull = cv2.convexHull(points)

    if DEBUG:
        # draw the hull on the image
        cv2.drawContours(draw_img, [hull], -1, (0, 255, 0), 2)

    # make a mask for the hull
    outer_mask = np.zeros_like(gray)
    inner_mask = np.zeros_like(gray)
    regular_mask = np.zeros_like(gray)

    # Compute the minimum area rectangle
    rect = cv2.minAreaRect(hull)

    # Convert the rectangle into 4 points
    box = np.int0(cv2.boxPoints(rect))

    if DEBUG:
        # Draw the minimum area rectangle
        cv2.drawContours(draw_img, [box], -1, (0, 0, 255), 2)

    # Increase the rectangle size in all directions
    width, height = rect[1][0] * ENLARGE_RECT_BY, rect[1][1] * ENLARGE_RECT_BY
    # Use the updated width and height while keeping the same center and angle
    enlarged_rect = (rect[0], (width, height), rect[2])

    # Decrease the rectangle size in all directions
    width, height = rect[1][0] / ENLARGE_RECT_BY, rect[1][1] / ENLARGE_RECT_BY
    # Use the updated width and height while keeping the same center and angle
    reduced_rect = (rect[0], (width, height), rect[2])

    # Convert the updated rectangle into 4 points
    enlarged_box = np.int0(cv2.boxPoints(enlarged_rect))
    reduced_box = np.int0(cv2.boxPoints(reduced_rect))

    outer_mask = cv2.drawContours(outer_mask, [enlarged_box], -1, 255, cv2.FILLED)
    inner_mask = cv2.drawContours(inner_mask, [reduced_box], -1, 255, cv2.FILLED)
    regular_mask = cv2.drawContours(regular_mask, [box], -1, 255, cv2.FILLED)

    # Draw the minimum area rectangle
    cv2.drawContours(draw_img, [box], -1, (0, 0, 255), 2)

    if DEBUG:
        # Draw the minimum area rectangle
        cv2.drawContours(draw_img, [enlarged_box, reduced_box], -1, (0, 0, 255), 2)

        # draw filled contours on the mask
        cv2.imshow('mask', outer_mask)
        cv2.waitKey(0)

    return outer_mask, inner_mask, regular_mask, draw_img


def apply_color_mask(orig_img, lower_ranges, upper_ranges, bg_mask=None):
    hsv = cv2.cvtColor(orig_img, cv2.COLOR_BGR2HSV)
    masks = []
    for lower_range, upper_range in zip(lower_ranges, upper_ranges):
        # Define range for red color
        lower = np.array(lower_range)
        upper = np.array(upper_range)
        masks.append(cv2.inRange(hsv, lower, upper))
    # Combine the masks
    mask = sum(masks)
    kernel = np.ones((2, 2), np.uint8)
    mask = cv2.dilate(mask, kernel, iterations=1)
    mask = cv2.erode(mask, kernel, iterations=5)

    if bg_mask is not None:
        mask = cv2.bitwise_and(mask, bg_mask)

    if DEBUG:
        cv2.imshow('mask', mask)
        cv2.waitKey(0)
    # find contours in the mask
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    # now find the contours in the bg_mask
    contours_bg, _ = cv2.findContours(bg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # find contours that are inside the contours_bg
    for contour_bg in contours_bg:
        test_mask_bg = np.zeros_like(mask)
        test_mask_bg = cv2.drawContours(test_mask_bg, [contour_bg], -1, 255, 2)

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 100:
                continue
            test_mask = np.zeros_like(mask)
            test_mask = cv2.drawContours(test_mask, [contour], -1, 255, 2)
            intersection = cv2.bitwise_and(test_mask, test_mask_bg)
            if np.count_nonzero(intersection) > 0:
                mask = cv2.drawContours(mask, [contour], -1, 0, cv2.FILLED)

    if DEBUG:
        cv2.imshow('mask', mask)
        cv2.waitKey(0)
    return mask


def get_border_type(bg_mask, inside_mask, orig_img, draw_img):
    border_mask = bg_mask - inside_mask
    red = apply_color_mask(orig_img, red_border_lower, red_border_upper, bg_mask=border_mask)
    red_area = np.count_nonzero(red)
    green = apply_color_mask(orig_img, green_border_lower, green_border_upper, bg_mask=border_mask)
    green_area = np.count_nonzero(green)
    yellow = apply_color_mask(orig_img, yellow_border_lower, yellow_border_upper, bg_mask=border_mask)
    yellow_area = np.count_nonzero(yellow)
    # find which of colors is the most
    colors = {'Бактерiя': red_area, 'Рослинна клiтина': green_area, 'Клiтина грибiв': yellow_area}
    max_color_name = max(colors.items(), key=lambda x: x[1])[0]
    if colors[max_color_name] < 100:
        # draw text on the image
        cv2.putText(draw_img, 'Тваринна клiтина', (10, 50), cv2.FONT_HERSHEY_COMPLEX, 1, (255, 255, 255), 3)
        cv2.putText(draw_img, 'Тваринна клiтина', (10, 50), cv2.FONT_HERSHEY_COMPLEX, 1, (0, 0, 255), 2)
        return None
    else:
        # draw text on the image
        cv2.putText(draw_img, f'{max_color_name}', (10, 50), cv2.FONT_HERSHEY_COMPLEX, 1, (255, 255, 255), 3)
        cv2.putText(draw_img, f'{max_color_name}', (10, 50), cv2.FONT_HERSHEY_COMPLEX, 1, (0, 0, 255), 2)
    return max_color_name


def lookup(img):
    draw_img = img.copy()
    bg_mask, inside_mask, regular_mask, draw_img = filter_background(img, draw_img)
    found_red, draw_img = filter_ellipse(bg_mask, img, draw_img, red_lower, red_upper, 'Ядро', 'Мiтохондрiя',
                                         name_if_non_ellipse='Кiльцева ДНК')
    found_white, draw_img = filter_ellipse(bg_mask, img, draw_img, white_range_lower, white_range_upper, 'Лiзосоми',
                                           name_if_non_ellipse='Вакуоль', size_of_non_ellipse=0.05)
    found_darkblue, draw_img = filter_ellipse(bg_mask, img, draw_img, darkblue_range_lower, darkblue_range_upper, '?',
                                              name_if_non_ellipse='Клiтинний центр', size_of_non_ellipse=0.005)
    found_yellow, draw_img = filter_random_figure(bg_mask, img, draw_img, yellow_range_lower, yellow_range_upper, 'Апарат гольджi')
    found_orange, draw_img = filter_random_figure(bg_mask, img, draw_img, orange_range_lower, orange_range_upper, 'Ендоплазматична сiтка')
    found_green, draw_img = filter_random_figure(bg_mask, img, draw_img, green_range_lower, green_range_upper,
                                                 'Хлоропласт')
    found_purple, draw_img = filter_ellipse(bg_mask, img, draw_img, purple_range_lower, purple_range_upper, 'Рибосома',
                                            min_size=0.002)
    found = found_red + found_white + found_darkblue + found_yellow + found_orange + found_green + found_purple

    border_type = get_border_type(bg_mask, inside_mask, img, draw_img)

    return draw_img, list(set(found)), border_type


def main():
    # iterate over all images in the current folder
    for file in os.listdir('.'):
        if file.endswith('.jpg'):
            img = read_image(file)
            draw_img, found, border_type = lookup(img)
            print(found, border_type)
            cv2.imshow('', draw_img)
            cv2.waitKey(0)
            cv2.destroyAllWindows()


if __name__ == '__main__':
    main()
