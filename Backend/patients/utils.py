from .models import Patient


def resolve_patient(identifier):
    """
    Robustly resolves a Patient instance across all API views:
    1. Exact primary key (e.g. 100)
    2. Exact device_id (e.g. 'ESP32_NODE_01')
    3. Ward index alias ('1' -> 'ESP32_NODE_01', '2' -> 'ESP32_NODE_02', etc.)
    4. Semantic aliases ('latest', 'default', 'current')
    5. Single-node prototype fallback (only if exactly 1 patient exists)
    """
    if not identifier:
        return Patient.objects.order_by('id').first()

    ident_str = str(identifier).strip()

    # 1. Exact primary key match
    if ident_str.isdigit():
        p = Patient.objects.filter(pk=int(ident_str)).first()
        if p:
            return p

    # 2. Exact device_id match
    p = Patient.objects.filter(device_id=ident_str).first()
    if p:
        return p

    # 3. Ward index alias
    index_map = {
        '1': 'ESP32_NODE_01',
        '2': 'ESP32_NODE_02',
        '3': 'ESP32_NODE_03',
        '4': 'ESP32_NODE_04',
    }
    if ident_str in index_map:
        p = Patient.objects.filter(device_id=index_map[ident_str]).first()
        if p:
            return p

    # 4. Semantic aliases
    if ident_str in ('latest', 'default', 'current'):
        return Patient.objects.order_by('id').first()

    # 5. Single-node prototype fallback
    if ident_str == '1' and Patient.objects.count() == 1:
        return Patient.objects.first()

    return None
