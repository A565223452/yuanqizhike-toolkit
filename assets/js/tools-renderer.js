/**
 * YuanqiZhiKe Toolkit - Tools Renderer Module
 * 公共工具卡片渲染模块，所有分类页共享
 */

// HTML 转义函数
function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// 创建工具卡片
function createToolCard(tool, t) {
    var card = document.createElement('div');
    card.className = 'tool-card';

    var featuresHtml = '';
    if (tool.features && tool.features.length > 0) {
        featuresHtml = '<ul class="tool-features">';
        tool.features.forEach(function(feature) {
            featuresHtml += '<li>' + escapeHtml(feature) + '</li>';
        });
        featuresHtml += '</ul>';
    }

    var viewDetailsHtml = '';
    if (tool.detailUrl) {
        var detailPath = tool.detailUrl;
        if (detailPath.indexOf('http') !== 0 && detailPath.indexOf('/') !== 0) {
            detailPath = '/' + detailPath;
        }
        viewDetailsHtml = '<a href="' + detailPath + '" class="btn btn-view-details">' + 
            (t ? t('tool.viewDetails', 'View Details') : 'View Details') + '</a>';
    }

    var downloadHtml = '';
    if (tool.zipUrl) {
        downloadHtml = '<button class="btn btn-download-zip btn-download" data-download="' + 
            escapeHtml(tool.zipUrl) + '">' + 
            (t ? t('tool.downloadZip', 'Download ZIP') : 'Download ZIP') + '</button>';
    }

    var iconPath = tool.icon;
    var isSvgIcon = tool.icon && (tool.icon.indexOf('assets/') === 0 || tool.icon.indexOf('.svg') === tool.icon.length - 4);
    if (isSvgIcon && iconPath && iconPath.indexOf('/') !== 0 && iconPath.indexOf('http') !== 0) {
        iconPath = '/' + iconPath;
    }
    var iconHtml = '';
    if (isSvgIcon) {
        iconHtml = '<img src="' + escapeHtml(iconPath) + '" alt="' + escapeHtml(tool.title) + '">';
    } else {
        iconHtml = tool.icon || '&#128187;';
    }

    card.innerHTML =
        '<div class="tool-icon">' + iconHtml + '</div>' +
        '<h3>' + escapeHtml(tool.title) + '</h3>' +
        '<p class="tool-desc">' + escapeHtml(tool.desc) + '</p>' +
        featuresHtml +
        '<div class="tool-actions">' +
        viewDetailsHtml +
        downloadHtml +
        '</div>';

    if (isSvgIcon) {
        var img = card.querySelector('.tool-icon img');
        if (img) {
            img.addEventListener('error', function() {
                this.outerHTML = '&#128183;';
            });
        }
    }

    return card;
}

// 初始化下载弹窗
function initDownloadModal() {
    var downloadBtns = document.querySelectorAll('.btn-download-zip');
    var modalOverlay = document.getElementById('licenseModal');
    var modalClose = document.getElementById('modalClose');
    var checkbox = document.getElementById('licenseAgree');
    var confirmBtn = document.getElementById('confirmDownload');
    var cancelBtn = document.getElementById('cancelDownload');

    if (!downloadBtns.length || !modalOverlay) return;

    downloadBtns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            var downloadUrl = this.getAttribute('data-download') || '';
            var downloadAttribute = document.querySelector('.btn-download:not(.btn-download-zip)');
            if (downloadAttribute) {
                downloadAttribute.setAttribute('data-download', downloadUrl);
            }
            resetModal();
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    function closeModal() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        resetModal();
    }

    function resetModal() {
        if (checkbox) checkbox.checked = false;
        if (confirmBtn) {
            confirmBtn.classList.add('btn-disabled');
        }
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });

    if (checkbox && confirmBtn) {
        var currentDownloadUrl = '';
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                confirmBtn.classList.remove('btn-disabled');
            } else {
                confirmBtn.classList.add('btn-disabled');
            }
        });

        confirmBtn.addEventListener('click', function() {
            var downloadBtn = document.querySelector('.btn-download:not(.btn-download-zip)');
            var url = downloadBtn ? downloadBtn.getAttribute('data-download') : '';
            if (checkbox.checked && url) {
                var link = document.createElement('a');
                link.href = url;
                link.download = '';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                closeModal();
            }
        });
    }
}

// 渲染工具网格
function renderToolsGrid(tools, containerId, categoryName) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var translatedCatName = typeof window.I18N !== 'undefined' && window.I18N.t ? 
        window.I18N.t('categories.' + categoryName.replace(/[^a-zA-Z0-9]/g, '') + '.title', categoryName) : 
        categoryName;
    var catTitleEl = container.querySelector('.category-title span');
    if (catTitleEl) catTitleEl.textContent = translatedCatName;

    var toolsGrid = container.querySelector('.tools-grid');
    if (!toolsGrid) return;

    var t = window.I18N ? I18N.t.bind(I18N) : function(key, fb) { return fb || key; };

    var categoryTools = tools.filter(function(tool) {
        return tool.category === categoryName;
    });

    categoryTools.forEach(function(tool) {
        var card = createToolCard(tool, t);
        toolsGrid.appendChild(card);
    });

    if (categoryTools.length === 0) {
        toolsGrid.innerHTML = '<div class="tool-card coming-soon">' +
            '<div class="tool-icon">&#128736;</div>' +
            '<h3>' + (t ? t('tool.comingSoon', 'Coming Soon') : 'Coming Soon') + '</h3>' +
            '<p class="tool-desc">' + (t ? t('tool.comingSoonDesc', 'Tools in this category are currently under development.') : 'Tools in this category are currently under development.') + '</p>' +
            '<div class="tool-actions">' +
            '<span class="btn btn-secondary" style="opacity: 0.6; cursor: default;">' + (t ? t('tool.stayTuned', 'Stay Tuned') : 'Stay Tuned') + '</span>' +
            '</div>' +
            '</div>';
    }

    initDownloadModal();
}