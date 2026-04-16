# EdgeIQ

EdgeIQ is a quantitative intelligence platform designed to identify mispricings and opportunities within prediction markets using institutional-grade mathematical models mapped alongside simple, accessible user interfaces.

## Project Architecture

This application consists of a modern React-based frontend powered by Vite and styled with TailwindCSS. The system leverages custom responsive design patterns and a dedicated routing layer to provide a seamless application experience across all devices.

## Recent Updates & Enhancements

- **UI/UX Accessibility**: Removed complex technical finance jargon across the entire platform. The application is now positioned using clear, straightforward language aimed at mainstream audiences.
- **Protective Routing**: Implemented an authentication context. The dashboard elements (Markets, Data Insights, Analysis Terminal, and Account Wallet) are completely secured behind a login gateway.
- **Mobile Responsiveness & Unification**: Completely unified the mobile and desktop user interfaces. The dashboard now features an iOS/Android-style bottom navigation bar, and the landing page dynamically down-scales its robust desktop grids to perfectly fit mobile viewports.
- **Navigation Re-architecture**: Developed a collapsible side-navigation pane for desktop and a sticky bottom-navbar for mobile layouts, equipped with a responsive hamburger dropdown menu on the landing page.
- **Micro-Animations**: Introduced a sweeping, dynamic "Tada" physics-based delay animation to the primary hero heading to instantly engage new users.
- **Theming System**: Fully integrated light and dark modes matching the updated brand guidelines, configurable directly from the sidebar.
- **Pricing Integration**: Extracted the pricing page from the core internal dashboard navigation, refining the user upgrade flow to focus on prominent Call-To-Action entry points.
- **Codebase Standardization**: Executed a comprehensive pass over the frontend codebase utilizing Prettier and ESLint implementations to enforce perfect industry-standard documentation formatting and indentation.

## Setup Instructions

1. Navigate to the Frontend directory: `cd Frontend`
2. Install project dependencies: `npm install`
3. Launch the development server: `npm run dev`