
class DocsGenerator {
    constructor() {
        this.docs = null;
        this.currentSection = null;
        this.init();
    }

    async init() {
        try {
            await this.loadDocs();
            this.generateNavigation();
            this.generateContent();
            this.setupEventListeners();
            this.hideLoading();
        } catch (error) {
            this.showError('Failed to load documentation');
            console.error('Error loading docs:', error);
        }
    }

    async loadDocs() {
        const response = await fetch('docs.json');
        if (!response.ok) {
            throw new Error('Failed to load docs.json');
        }
        this.docs = await response.json();
    }

    generateNavigation() {
        const sidebar = document.getElementById('sidebar-nav');
        if (!this.docs || !this.docs.sections) return;

        sidebar.innerHTML = this.docs.sections.map(section => `
            <a href="#${section.id}" class="sidebar-link block px-3 py-2 rounded-md text-gray-700 hover:text-indigo-600" data-section="${section.id}">
                <i class="${section.icon || 'fas fa-circle'} mr-2 text-sm"></i>
                ${section.title}
            </a>
        `).join('');
    }

    generateContent() {
        const content = document.getElementById('content');
        if (!this.docs) return;

        let html = '';

        // Hero Section
        if (this.docs.hero) {
            html += this.generateHeroSection(this.docs.hero);
        }

        // Features Section
        if (this.docs.features) {
            html += this.generateFeaturesSection(this.docs.features);
        }

        // Main Sections
        if (this.docs.sections) {
            this.docs.sections.forEach(section => {
                html += this.generateSection(section);
            });
        }

        content.innerHTML = html;
        
        // Highlight code blocks
        setTimeout(() => {
            Prism.highlightAll();
        }, 100);
    }

    generateHeroSection(hero) {
        return `
            <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-8 mb-12">
                <div class="max-w-3xl">
                    <h1 class="text-4xl font-bold mb-4">${hero.title}</h1>
                    <p class="text-xl text-indigo-100 mb-6">${hero.description}</p>
                    <div class="flex flex-wrap gap-4">
                        ${hero.badges?.map(badge => `
                            <img src="${badge.src}" alt="${badge.alt}" class="h-6">
                        `).join('') || ''}
                    </div>
                    <div class="mt-6">
                        <pre class="bg-black bg-opacity-30 rounded-lg p-4 text-indigo-100"><code class="language-bash">${hero.installation}</code></pre>
                    </div>
                </div>
            </div>
        `;
    }

    generateFeaturesSection(features) {
        return `
            <div class="mb-12">
                <h2 class="text-3xl font-bold text-gray-900 mb-8 text-center">✨ Features</h2>
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${features.map(feature => `
                        <div class="card-hover bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                            <div class="flex items-start space-x-4">
                                <div class="text-2xl">${feature.icon}</div>
                                <div>
                                    <h3 class="font-semibold text-gray-900 mb-2">${feature.title}</h3>
                                    <p class="text-gray-600 text-sm">${feature.description}</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateSection(section) {
        return `
            <section id="${section.id}" class="mb-16">
                <div class="flex items-center mb-6">
                    <i class="${section.icon || 'fas fa-circle'} text-indigo-600 text-2xl mr-3"></i>
                    <h2 class="text-3xl font-bold text-gray-900">${section.title}</h2>
                </div>
                
                ${section.description ? `<p class="text-lg text-gray-700 mb-8">${section.description}</p>` : ''}
                
                ${section.content?.map(item => this.generateContentItem(item)).join('') || ''}
            </section>
        `;
    }

    generateContentItem(item) {
        switch (item.type) {
            case 'text':
                return `<div class="prose prose-lg max-w-none mb-6">${item.content}</div>`;
            
            case 'code':
                return `
                    <div class="mb-6">
                        ${item.title ? `<h4 class="text-lg font-semibold text-gray-900 mb-3">${item.title}</h4>` : ''}
                        <div class="code-block overflow-hidden">
                            <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto"><code class="language-${item.language || 'javascript'}">${this.escapeHtml(item.content)}</code></pre>
                        </div>
                    </div>
                `;
            
            case 'api':
                return this.generateApiDoc(item);
            
            case 'table':
                return this.generateTable(item);
            
            case 'alert':
                return `
                    <div class="bg-${item.variant || 'blue'}-50 border border-${item.variant || 'blue'}-200 rounded-lg p-4 mb-6">
                        <div class="flex items-start">
                            <i class="fas fa-${item.icon || 'info-circle'} text-${item.variant || 'blue'}-600 mt-1 mr-3"></i>
                            <div class="text-${item.variant || 'blue'}-800">${item.content}</div>
                        </div>
                    </div>
                `;
            
            case 'grid':
                return `
                    <div class="grid md:grid-cols-2 gap-6 mb-8">
                        ${item.items?.map(gridItem => `
                            <div class="bg-white rounded-lg p-6 shadow-md border border-gray-100">
                                <h4 class="font-semibold text-gray-900 mb-3">${gridItem.title}</h4>
                                <div class="text-gray-700">${gridItem.content}</div>
                            </div>
                        `).join('') || ''}
                    </div>
                `;
            
            default:
                return '';
        }
    }

    generateApiDoc(api) {
        return `
            <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h4 class="text-xl font-semibold text-gray-900 mb-2">
                    <code class="bg-gray-100 px-2 py-1 rounded text-indigo-600">${api.name}</code>
                </h4>
                <p class="text-gray-700 mb-4">${api.description}</p>
                
                ${api.parameters ? `
                    <div class="mb-4">
                        <h5 class="font-semibold text-gray-900 mb-2">Parameters:</h5>
                        <ul class="space-y-2">
                            ${api.parameters.map(param => `
                                <li class="text-sm">
                                    <code class="bg-gray-100 px-2 py-1 rounded text-purple-600">${param.name}</code>
                                    <span class="text-gray-600">(${param.type}${param.optional ? ', optional' : ''})</span>
                                    - ${param.description}
                                    ${param.default ? `<br><small class="text-gray-500">Default: <code>${param.default}</code></small>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${api.returns ? `
                    <div class="mb-4">
                        <h5 class="font-semibold text-gray-900 mb-2">Returns:</h5>
                        <p class="text-sm text-gray-700">${api.returns}</p>
                    </div>
                ` : ''}
                
                ${api.example ? `
                    <div class="mt-4">
                        <h5 class="font-semibold text-gray-900 mb-2">Example:</h5>
                        <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto"><code class="language-javascript">${this.escapeHtml(api.example)}</code></pre>
                    </div>
                ` : ''}
            </div>
        `;
    }

    generateTable(table) {
        return `
            <div class="overflow-x-auto mb-6">
                <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead class="bg-gray-50">
                        <tr>
                            ${table.headers?.map(header => `
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">${header}</th>
                            `).join('') || ''}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${table.rows?.map(row => `
                            <tr class="hover:bg-gray-50">
                                ${row.map(cell => `
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${cell}</td>
                                `).join('')}
                            </tr>
                        `).join('') || ''}
                    </tbody>
                </table>
            </div>
        `;
    }

    setupEventListeners() {
        // Smooth scroll for navigation links
        document.addEventListener('click', (e) => {
            if (e.target.closest('[href^="#"]')) {
                e.preventDefault();
                const target = document.querySelector(e.target.closest('[href^="#"]').getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });

        // Back to top button
        const backToTop = document.getElementById('backToTop');
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTop.classList.remove('hidden');
            } else {
                backToTop.classList.add('hidden');
            }
        });

        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Active navigation highlighting
        this.setupActiveNavigation();
    }

    setupActiveNavigation() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    document.querySelectorAll('.sidebar-link').forEach(link => {
                        link.classList.remove('text-indigo-600', 'bg-indigo-50');
                        link.classList.add('text-gray-700');
                    });
                    
                    const activeLink = document.querySelector(`[data-section="${id}"]`);
                    if (activeLink) {
                        activeLink.classList.add('text-indigo-600', 'bg-indigo-50');
                        activeLink.classList.remove('text-gray-700');
                    }
                }
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('section[id]').forEach(section => {
            observer.observe(section);
        });
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('content').classList.remove('hidden');
    }

    showError(message) {
        document.getElementById('loading').innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                <p class="text-red-600 text-lg">${message}</p>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the documentation generator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DocsGenerator();
});
