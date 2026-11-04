"""Run with Playwright installed and server.py running on port 5174.

Uses installed Microsoft Edge. Saves review screenshots outside the app assets.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5174'
OUT = Path(__file__).resolve().parents[3] / 'review-artifacts' / 'karmma-menu'
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    failed = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failed.append(f'{response.status} {response.url}') if response.url.startswith(BASE) and response.status >= 400 else None)
    page.goto(BASE + '/menu/?location=grapevine')
    page.locator('.menu-card').first.wait_for()
    data = page.evaluate("async () => (await import('/src/menu-data.js?v=locations-1')).menus")
    totals = {}
    for city, menu in data.items():
        totals[city] = sum(len(category['items']) for category in menu['categories'])
        assert len({category['id'] for category in menu['categories']}) == len(menu['categories'])
        for category in menu['categories']:
            assert len({item['name'] for item in category['items']}) == len(category['items'])
            for item in category['items']:
                price = item['price']
                assert price is None or isinstance(price, (int, float, list))
                if isinstance(price, list):
                    assert all(isinstance(value, (int, float)) and value > 0 for _, value in price)
        pdf = page.request.get(BASE + menu['pdf'])
        assert pdf.status == 200 and pdf.body().startswith(b'%PDF-')
    # Verify every referenced photo loads and decodes, including lazy/offscreen cards.
    images = sorted({item['image'] for menu in data.values() for category in menu['categories'] for item in category['items'] if item['image']})
    image_results = page.evaluate("""async paths => Promise.all(paths.map(path => new Promise(resolve => {
        const img = new Image(); img.onload = () => resolve({path, ok: img.naturalWidth > 0});
        img.onerror = () => resolve({path, ok: false}); img.src = path;
    })))""", images)
    assert all(result['ok'] for result in image_results), image_results
    # Independent source-price checks: shared dishes must retain location prices.
    for city, price in [('grapevine', '$21.99'), ('dallas', '$16.99')]:
        page.goto(BASE + '/menu/?location=' + city)
        page.locator('[data-menu-search]').fill('Butter Chicken')
        assert price in page.locator('.menu-sections').inner_text()
        assert page.locator('[data-menu-search]').input_value() == 'Butter Chicken'
        page.locator('[data-menu-search]').fill('no-such-dish-123')
        assert page.locator('.empty').is_visible()
        page.locator('[data-clear-menu]').click()
        assert page.locator('.menu-card').count() > 50
        page.locator('[data-menu-filter="vegetarian"]').click()
        assert page.locator('.menu-card').count() == page.locator('.menu-card .tags').count()
        page.locator('[data-menu-filter="photos"]').click()
        assert page.locator('.menu-card.no-photo').count() == 0
        page.locator('[data-menu-filter=""]').click()
    page.locator('[data-menu-type="happy-hour"]').click()
    assert '4 PM' in page.locator('.menu-sections').inner_text()
    assert '$9.00' in page.locator('.menu-sections').inner_text()
    assert page.locator('[data-menu-location]').count() == 0
    page.locator('[data-menu-type="drinks"]').click()
    page.go_back()
    assert page.locator('h1').inner_text() == 'Dallas Menu'
    assert page.locator('[data-menu-type="happy-hour"]').get_attribute('aria-pressed') == 'true'
    page.go_forward()
    assert page.locator('[data-menu-type="drinks"]').get_attribute('aria-pressed') == 'true'
    responsive = []
    for width in [320, 390, 768, 1024, 1440, 1920]:
        page.set_viewport_size({'width': width, 'height': 1000})
        for city in ['dallas', 'grapevine']:
            page.goto(BASE + '/menu/?location=' + city)
            page.locator('.menu-card').first.wait_for()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, city, 'horizontal overflow')
            for type_name in (['food', 'drinks', 'happy-hour'] if city == 'dallas' else ['food', 'drinks']):
                page.locator(f'[data-menu-type="{type_name}"]').click()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, city, type_name)
                assert page.locator('.category-pills').evaluate('el => el.scrollWidth <= el.clientWidth')
                # Wrapped categories must still scroll headings below sticky controls.
                link = page.locator('[data-category]').last
                target = link.get_attribute('href')
                link.click()
                rect = page.locator(target + ' h2').bounding_box()
                nav_bottom = page.locator('.navbar').bounding_box()['height']
                sticky_bottom = page.locator('.menu-controls').evaluate("el => getComputedStyle(el).position === 'sticky' ? el.getBoundingClientRect().bottom : 0")
                assert rect['y'] >= max(nav_bottom, sticky_bottom) - 2, (width, city, type_name, rect)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('[data-menu-type="food"]').click()
            if width in [390, 1440]:
                page.screenshot(path=str(OUT / f'{city}-{width}.png'))
            responsive.append(f'{city}:{width}')
    # Direct links, refresh, unknown query values, mobile entry point, and printing.
    for route in ['/menu', '/menu/?location=invalid&type=invalid', '/menu/?location=dallas&type=drinks', '/menu/print?location=dallas', '/menu/print/?location=grapevine']:
        page.goto(BASE + route)
        page.locator('h1').wait_for()
        assert page.locator('h1').count() == 1
        page.reload()
        page.locator('h1').wait_for()
        assert page.locator('h1').count() == 1
    for city in ['dallas', 'grapevine']:
        page.goto(BASE + '/menu/print/?location=' + city)
        page.locator('.print-item').first.wait_for()
        assert page.locator('.print-item').count() == totals[city]
        page.emulate_media(media='print')
        assert not page.locator('.navbar').is_visible()
        assert not page.locator('.print-actions').is_visible()
        page.emulate_media(media='screen')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(BASE + '/')
    page.locator('[data-menu-toggle]').wait_for()
    page.locator('[data-menu-toggle]').click()
    page.locator('[data-mobile-panel] a', has_text='Menu').click()
    assert page.locator('.location-dialog').is_visible()
    original_url = page.url
    for city in ['Grapevine', 'Dallas']:
        with page.expect_popup() as opened:
            page.locator('.location-dialog .location-option', has_text=city).click()
        menu_tab = opened.value
        menu_tab.locator('.menu-card').first.wait_for()
        assert menu_tab.locator('h1').inner_text() == city + ' Menu'
        assert menu_tab.locator('[data-menu-location]').count() == 0
        assert page.url == original_url
        assert page.locator('.location-dialog').is_visible()
        assert menu_tab.evaluate('window.opener === null')
        menu_tab.close()
    page.keyboard.press('Escape')
    assert not page.locator('.location-dialog').is_visible()
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.goto(BASE + '/')
    page.locator('.nav-links a', has_text='Menu').click()
    assert page.locator('.location-dialog').is_visible()
    page.screenshot(path=str(OUT / 'menu-location-picker.png'))
    page.locator('.location-close').click()
    page.get_by_role('link', name='View Menu', exact=True).first.click()
    assert page.locator('.location-dialog').is_visible()
    page.goto(BASE + '/menu/')
    page.locator('.location-menu-options').wait_for()
    assert page.locator('.location-menu-options a[target="_blank"]').count() == 2
    assert not errors, errors
    assert not failed, failed
    report = {'items': totals, 'decoded_images': len(images), 'responsive_checks': responsive, 'browser_errors': errors, 'failed_local_responses': failed}
    (OUT / 'checks.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    browser.close()
