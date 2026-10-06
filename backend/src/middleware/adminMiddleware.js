function requireAdmin(req, res, next) {
    const role = String(
        req.user?.role || ''
    ).toUpperCase();

    if (role !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required.',
        });
    }

    next();
}

module.exports = {
    requireAdmin,
};