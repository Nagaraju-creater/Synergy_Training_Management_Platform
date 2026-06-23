"""drop self nominations table

Revision ID: 22c1c4d603ad
Revises: 51586998f98a
Create Date: 2026-04-24 17:59:58.098702

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '22c1c4d603ad'
down_revision: Union[str, None] = '51586998f98a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('self_nominations')
    op.execute('DROP TYPE selfnominationstatus')


def downgrade() -> None:
    pass
