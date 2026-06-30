import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

OLD_BLOCK = '''  if (selectedMerchant) {
    return (
      <div>
        <div className="top-bar" style={{ gap: 12 }}>
          <button onClick={() => { setSelectedMerchant(null); setMerchantProducts([]) }} style={{ background: 'none', color: 'white', fontSize: 22, padding: '0 4px', border: 'none', cursor: 'pointer' }}>←</button>
          <div className="top-bar-logo" style={{ fontSize: 15 }}>{selectedMerchant.name}</div>
          <button style={{ background: 'none', color: 'white', position: 'relative', flexShrink: 0, marginLeft: 'auto', border: 'none', cursor: 'pointer' }} onClick={() => setCartOpen(true)}>
            <IconCart />
            {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
          </button>
        </div>
        <div className="page">
          <div style={{ background: 'var(--green-dark)', padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{selectedMerchant.emoji}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 4 }}>{selectedMerchant.name}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>📍 {selectedMerchant.suburb} · {selectedMerchant.category}</div>
            {selectedMerchant.phone && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>📞 {selectedMerchant.phone}</div>}
          </div>
          <div className="section-header">
            <span className="section-title">Products ({merchantProducts.length})</span>
          </div>
          {merchantProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <div>No products yet</div>
            </div>
          ) : (
            <div className="product-grid">
              {merchantProducts.map(p => (
                <div key={p.id} className="product-card">
                  <div className="product-img">{p.image_url ? <img src={p.image_url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"8px"}} /> : <div style={{fontSize:40}}>{p.emoji || "📦"}</div>}</div>
                  <div className="product-info">
                    <div className="product-name">{p.name}</div>
                    <div className="product-price">${p.price.toFixed(2)}</div>
                    <button className="btn-add" onClick={() => addToCart(p)}>+ Add</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>'''

NEW_BLOCK = '''  if (selectedMerchant) {
    const grouped: Record<string, Product[]> = {}
    merchantProducts.forEach(p => {
      const cat = (p.category && p.category.trim()) || 'Other'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(p)
    })
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      if (a === 'Other') return 1
      if (b === 'Other') return -1
      return a.localeCompare(b)
    })
    const filteredGrouped: Record<string, Product[]> = {}
    sortedCategories.forEach(c => {
      const list = productSearch.trim()
        ? grouped[c].filter(p =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            (p.description || '').toLowerCase().includes(productSearch.toLowerCase())
          )
        : grouped[c]
      if (list.length > 0) filteredGrouped[c] = list
    })
    const visibleCategories = Object.keys(filteredGrouped)
    const totalVisible = visibleCategories.reduce((sum, c) => sum + filteredGrouped[c].length, 0)

    return (
      <div>
        <div className="top-bar" style={{ gap: 12 }}>
          <button onClick={() => { setSelectedMerchant(null); setMerchantProducts([]); setProductSearch('') }} style={{ background: 'none', color: 'white', fontSize: 22, padding: '0 4px', border: 'none', cursor: 'pointer' }}>←</button>
          <div className="top-bar-logo" style={{ fontSize: 15 }}>{selectedMerchant.name}</div>
          <button style={{ background: 'none', color: 'white', position: 'relative', flexShrink: 0, marginLeft: 'auto', border: 'none', cursor: 'pointer' }} onClick={() => setCartOpen(true)}>
            <IconCart />
            {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
          </button>
        </div>
        <div className="page">
          <div style={{ background: 'var(--green-dark)', padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{selectedMerchant.emoji}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 4 }}>{selectedMerchant.name}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>📍 {selectedMerchant.suburb} · {selectedMerchant.category}</div>
            {selectedMerchant.phone && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>📞 {selectedMerchant.phone}</div>}
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--cream)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
              <span style={{ fontSize: 16, color: 'var(--text-3)' }}>🔍</span>
              <input
                type="text"
                placeholder={`Search ${selectedMerchant.name} products...`}
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: 'var(--green-dark)' }}
              />
              {productSearch && (
                <button onClick={() => setProductSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-3)', padding: 0 }}>✕</button>
              )}
            </div>
            {productSearch && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, paddingLeft: 4 }}>
                {totalVisible === 0 ? 'No products found' : `${totalVisible} product${totalVisible !== 1 ? 's' : ''} found`}
              </div>
            )}
          </div>

          {merchantProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <div>No products yet</div>
            </div>
          ) : visibleCategories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>No products match "{productSearch}"</div>
              <button onClick={() => setProductSearch('')} style={{ marginTop: 12, background: 'var(--green)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Clear search</button>
            </div>
          ) : (
            visibleCategories.map((c, idx) => (
              <div key={c}>
                {idx > 0 && <div style={{ height: 8, background: 'var(--cream-dark)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} />}
                <div style={{ padding: '14px 16px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '2px solid var(--green)', marginBottom: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--green-dark)' }}>{c}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>{filteredGrouped[c].length} item{filteredGrouped[c].length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="product-grid" style={{ padding: '0 16px 16px' }}>
                  {filteredGrouped[c].map(p => (
                    <div key={p.id} className="product-card">
                      <div className="product-img">{p.image_url ? <img src={p.image_url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"8px"}} /> : <div style={{fontSize:40}}>{p.emoji || "📦"}</div>}</div>
                      <div className="product-info">
                        <div className="product-name">{p.name}</div>
                        <div className="product-price">${p.price.toFixed(2)}</div>
                        <button className="btn-add" onClick={() => addToCart(p)}>+ Add</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>'''

if OLD_BLOCK not in content:
    print("ERROR: old block not found, no changes made")
else:
    content = content.replace(OLD_BLOCK, NEW_BLOCK)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("SUCCESS: App.tsx updated")
