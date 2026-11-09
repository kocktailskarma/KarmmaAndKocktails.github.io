"""Verify menu categories follow manual scrolling, clicks, and filtered results."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://localhost:5174'
OUT = Path(__file__).resolve().parent / 'output'  # git-ignored; screenshots and checks.json land here
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def scroll_to(section_id):
        # Scroll the document without clicking a category or changing its state.
        page.evaluate('''id => {
            const nav = document.querySelector('.navbar').getBoundingClientRect().height;
            const height = ['.menu-controls', '.category-pills'].reduce((sum, s) => { const el = document.querySelector(s); return sum + (getComputedStyle(el).position === 'sticky' ? el.offsetHeight : 0); }, 0);
            window.scrollTo({ top: document.getElementById(id).getBoundingClientRect().top + scrollY - nav - height - 40, behavior: 'instant' });  // instant: the page has CSS smooth scrolling
        }''', section_id)
        expect(page.locator('[data-category][aria-current="true"]')).to_have_attribute('href', '#' + section_id)

    checks = 0
    for width in [390, 1024, 1440]:
        page.set_viewport_size({'width': width, 'height': 1000})
        for city in ['grapevine', 'dallas']:
            page.goto(BASE + '/menu/?location=' + city)
            page.locator('.menu-type:not([hidden]) .menu-card').first.wait_for()
            page.locator('[data-category][href="#menu-specials"]').click()
            expect(page.locator('[data-category][aria-current="true"]')).to_have_attribute('href', '#menu-specials')
            ids = page.locator('.menu-type:not([hidden]) .menu-category').evaluate_all('sections => sections.map(section => section.id)')
            for section_id in ids + list(reversed(ids)):
                scroll_to(section_id)
                checks += 1
            if city == 'grapevine' and width == 1440:
                page.locator('[data-category][href="#menu-specials"]').click()
                distance = page.evaluate("document.getElementById('menu-wings').getBoundingClientRect().top - document.getElementById('menu-specials').getBoundingClientRect().top")
                page.mouse.move(1000, 800)
                page.mouse.wheel(0, distance)
                expect(page.locator('[data-category][aria-current="true"]')).to_have_attribute('href', '#menu-wings')
                page.screenshot(path=str(OUT / 'grapevine-wings-scroll.png'), animations='disabled')
                page.mouse.wheel(0, -distance)
                expect(page.locator('[data-category][aria-current="true"]')).to_have_attribute('href', '#menu-specials')
            page.locator('[data-menu-search]').fill('momo')
            scroll_to('menu-momos')
            page.locator('[data-menu-search]').fill('no-results-123')
            expect(page.locator('[data-category][aria-current]')).to_have_count(0)
            page.locator('[data-clear-menu]').click()
            page.locator('[data-menu-type="drinks"]').click()
            drink_ids = page.locator('.menu-type:not([hidden]) .menu-category').evaluate_all('sections => sections.map(section => section.id)')
            for section_id in drink_ids:
                scroll_to(section_id)
            # Leaving the menu must disconnect tracking; navigating back starts fresh.
            page.locator('.footer a[data-link]', has_text='About').first.click()
            page.mouse.wheel(0, 600)
            page.go_back()
            page.locator('.menu-type:not([hidden]) .menu-category').first.wait_for()
            scroll_to(drink_ids[0])
    assert not errors, errors
    print(f'Passed {checks} food-section scroll checks, wheel scrolling, clicks, search, drinks, and navigation cleanup; no browser errors.')
    browser.close()
